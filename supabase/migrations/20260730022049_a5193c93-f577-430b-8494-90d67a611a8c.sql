
-- Role enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  discord_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  max_scripts INTEGER NOT NULL DEFAULT 5,
  max_panels INTEGER NOT NULL DEFAULT 5,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'owner'));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, discord_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,''),'@',1)),
    NEW.raw_user_meta_data->>'provider_id'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- api_keys
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own api keys" ON public.api_keys FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- scripts
CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  public_id TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(9),'hex'),
  code TEXT NOT NULL DEFAULT '',
  obfuscated_code TEXT,
  obfuscator TEXT,
  larph_hash TEXT,
  is_protected BOOLEAN NOT NULL DEFAULT false,
  ffa BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripts TO authenticated;
GRANT ALL ON public.scripts TO service_role;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scripts" ON public.scripts FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'owner')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'owner'));
CREATE TRIGGER scripts_updated BEFORE UPDATE ON public.scripts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- script releases
CREATE TABLE public.script_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  obfuscated_code TEXT NOT NULL,
  obfuscator TEXT,
  larph_hash TEXT,
  is_protected BOOLEAN NOT NULL DEFAULT false,
  is_beta BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.script_releases TO authenticated;
GRANT ALL ON public.script_releases TO service_role;
ALTER TABLE public.script_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own releases" ON public.script_releases FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'owner')) WITH CHECK (user_id = auth.uid());

-- panels
CREATE TABLE public.panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
  discord_role_id TEXT,
  webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.panels TO authenticated;
GRANT ALL ON public.panels TO service_role;
ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own panels" ON public.panels FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'owner')) WITH CHECK (user_id = auth.uid());

-- license keys
CREATE TABLE public.license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES public.panels(id) ON DELETE SET NULL,
  batch_id UUID,
  key TEXT NOT NULL UNIQUE,
  discord_id TEXT,
  hwid TEXT,
  note TEXT,
  hours_valid INTEGER,
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_keys TO authenticated;
GRANT ALL ON public.license_keys TO service_role;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own keys" ON public.license_keys FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'owner')) WITH CHECK (user_id = auth.uid());

-- key batches
CREATE TABLE public.key_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES public.panels(id) ON DELETE SET NULL,
  script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
  size INTEGER NOT NULL,
  hours_valid INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.key_batches TO authenticated;
GRANT ALL ON public.key_batches TO service_role;
ALTER TABLE public.key_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own batches" ON public.key_batches FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- hwid bans
CREATE TABLE public.hwid_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hwid TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, hwid)
);
GRANT SELECT, INSERT, DELETE ON public.hwid_bans TO authenticated;
GRANT ALL ON public.hwid_bans TO service_role;
ALTER TABLE public.hwid_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hwid bans" ON public.hwid_bans FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'owner')) WITH CHECK (user_id = auth.uid());

-- user bans (discord id)
CREATE TABLE public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, discord_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_bans TO authenticated;
GRANT ALL ON public.user_bans TO service_role;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user bans" ON public.user_bans FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'owner')) WITH CHECK (user_id = auth.uid());

-- whitelists
CREATE TABLE public.whitelists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  license_key_id UUID REFERENCES public.license_keys(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (script_id, discord_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whitelists TO authenticated;
GRANT ALL ON public.whitelists TO service_role;
ALTER TABLE public.whitelists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own whitelists" ON public.whitelists FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'owner')) WITH CHECK (user_id = auth.uid());
