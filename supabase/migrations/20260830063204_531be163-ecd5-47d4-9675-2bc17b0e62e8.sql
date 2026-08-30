
CREATE TABLE public.execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  script_id uuid REFERENCES public.scripts(id) ON DELETE SET NULL,
  license_key_id uuid REFERENCES public.license_keys(id) ON DELETE SET NULL,
  key text,
  hwid text,
  roblox_username text,
  roblox_user_id text,
  place_id text,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.execution_logs TO authenticated;
GRANT ALL ON public.execution_logs TO service_role;

ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own execution logs read" ON public.execution_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'::app_role));

CREATE INDEX execution_logs_user_created_idx ON public.execution_logs (user_id, created_at DESC);
CREATE INDEX execution_logs_script_created_idx ON public.execution_logs (script_id, created_at DESC);
