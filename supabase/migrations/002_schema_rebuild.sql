-- 002_schema_rebuild.sql
-- Full schema rebuild to match BackendSchema v1.0.
-- Drops all existing tables (no real user data at this stage) and recreates
-- with correct structure: auth.users FK, conversations, safety_events,
-- anon_session_id on daily_usage, RLS, indexes, trigger.

-- ── 1. Drop existing tables (reverse FK order) ───────────────────────────────
DROP TABLE IF EXISTS public.daily_usage   CASCADE;
DROP TABLE IF EXISTS public.memories      CASCADE;
DROP TABLE IF EXISTS public.messages      CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.safety_events CASCADE;
DROP TABLE IF EXISTS public.users         CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- ── 2. users — extends Supabase auth.users ───────────────────────────────────
CREATE TABLE public.users (
  id                    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone                 TEXT        UNIQUE,
  email                 TEXT        UNIQUE,
  tier                  TEXT        NOT NULL DEFAULT 'free'
                                      CHECK (tier IN ('free', 'plus')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  web_push_subscription JSONB,
  notif_time            TIME        DEFAULT '21:00:00',
  notif_enabled         BOOLEAN     DEFAULT true
);

-- ── 3. conversations ─────────────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  title       TEXT
);

-- ── 4. messages ──────────────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  safety_flagged  BOOLEAN     NOT NULL DEFAULT false
);

-- ── 5. memories ──────────────────────────────────────────────────────────────
CREATE TABLE public.memories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fact        TEXT        NOT NULL,
  category    TEXT        NOT NULL
                CHECK (category IN ('name','city','job','relationship','situation','other')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

-- ── 6. daily_usage ───────────────────────────────────────────────────────────
-- user_id nullable: anonymous users tracked via anon_session_id cookie instead
CREATE TABLE public.daily_usage (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID    REFERENCES public.users(id) ON DELETE CASCADE,
  anon_session_id  TEXT,
  date             DATE    NOT NULL DEFAULT CURRENT_DATE,
  msg_count        INT     NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

-- ── 7. safety_events — append-only, rows must never be deleted ───────────────
CREATE TABLE public.safety_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  message       TEXT        NOT NULL,
  trigger_type  TEXT        NOT NULL CHECK (trigger_type IN ('keyword', 'semantic')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 8. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX idx_messages_conversation_id
  ON public.messages(conversation_id);

CREATE INDEX idx_messages_user_id_created_at
  ON public.messages(user_id, created_at DESC);

CREATE INDEX idx_memories_user_id
  ON public.memories(user_id);

CREATE INDEX idx_daily_usage_user_date
  ON public.daily_usage(user_id, date);

-- Partial unique index for anonymous session tracking
CREATE UNIQUE INDEX idx_daily_usage_anon_date
  ON public.daily_usage(anon_session_id, date)
  WHERE anon_session_id IS NOT NULL;

CREATE INDEX idx_safety_events_created_at
  ON public.safety_events(created_at DESC);

-- ── 9. memories updated_at trigger ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 10. Row Level Security ───────────────────────────────────────────────────
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_events  ENABLE ROW LEVEL SECURITY;

-- users: read/update own row only
CREATE POLICY "users_own_row" ON public.users
  FOR ALL USING (auth.uid() = id);

-- conversations: own rows only
CREATE POLICY "conversations_own" ON public.conversations
  FOR ALL USING (auth.uid() = user_id);

-- messages: own rows only
CREATE POLICY "messages_own" ON public.messages
  FOR ALL USING (auth.uid() = user_id);

-- memories: own rows only (user can delete individual facts from Settings)
CREATE POLICY "memories_own" ON public.memories
  FOR ALL USING (auth.uid() = user_id);

-- daily_usage: read own row only — no browser writes ever
CREATE POLICY "daily_usage_own_read" ON public.daily_usage
  FOR SELECT USING (auth.uid() = user_id);

-- safety_events: NO policy — zero browser access, service role only
-- (intentionally omitted — no authenticated or anon role can read or write)
