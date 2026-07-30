ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS run_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz;

CREATE INDEX IF NOT EXISTS scripts_user_id_idx ON public.scripts (user_id);
CREATE INDEX IF NOT EXISTS scripts_public_id_idx ON public.scripts (public_id);
CREATE INDEX IF NOT EXISTS license_keys_key_idx ON public.license_keys (key);
CREATE INDEX IF NOT EXISTS whitelists_script_discord_idx ON public.whitelists (script_id, discord_id);

ALTER TABLE public.panels
  ADD COLUMN IF NOT EXISTS channel_id text,
  ADD COLUMN IF NOT EXISTS whitelist_channel_id text;

DROP TRIGGER IF EXISTS scripts_set_updated_at ON public.scripts;
CREATE TRIGGER scripts_set_updated_at BEFORE UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();