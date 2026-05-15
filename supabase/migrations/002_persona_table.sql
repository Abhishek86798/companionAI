-- User-defined AI companion persona.
-- companion_name defaults to 'Arjun'; tone/expectation/open_field are free text
-- injected into the system prompt after sanitization (see ai.py).
-- Always upsert on UNIQUE(user_id) — one row per user.
CREATE TABLE public.persona (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  companion_name TEXT NOT NULL DEFAULT 'Arjun',
  tone           TEXT,
  expectation    TEXT,
  open_field     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.persona ENABLE ROW LEVEL SECURITY;
CREATE POLICY "persona_own" ON public.persona
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_persona_user_id ON public.persona(user_id);

CREATE TRIGGER persona_updated_at
  BEFORE UPDATE ON public.persona
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
