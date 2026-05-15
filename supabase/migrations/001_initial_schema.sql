-- Shared trigger function — keeps updated_at columns current on every UPDATE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── users ──────────────────────────────────────────────────────────────────────
-- Mirrors auth.users for app-level profile data.
-- Rows are created lazily on first authenticated request (see dependencies.py).
CREATE TABLE public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone                 TEXT UNIQUE,
  email                 TEXT UNIQUE,
  tier                  TEXT NOT NULL DEFAULT 'free',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  web_push_subscription JSONB,
  notif_time            TIME DEFAULT '21:00',
  notif_enabled         BOOLEAN DEFAULT true
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_row" ON public.users
  FOR ALL USING ((SELECT auth.uid()) = id);

-- ── conversations ──────────────────────────────────────────────────────────────
-- user_id is NOT NULL here; made nullable in 003 for anon conversation support.
CREATE TABLE public.conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_own" ON public.conversations
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);

-- ── messages ───────────────────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,          -- 'user' | 'assistant'
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  safety_flagged  BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_own" ON public.messages
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_user_id_created_at ON public.messages(user_id, created_at DESC);

-- ── memories ───────────────────────────────────────────────────────────────────
-- One fact per category per user; extractor upserts on UNIQUE(user_id, category).
CREATE TABLE public.memories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fact       TEXT NOT NULL,
  category   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memories_own" ON public.memories
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_memories_user_id ON public.memories(user_id);

CREATE TRIGGER memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── daily_usage ────────────────────────────────────────────────────────────────
-- user_id is NOT NULL here; made nullable and anon_session_id added in 004.
CREATE TABLE public.daily_usage (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date      DATE NOT NULL DEFAULT CURRENT_DATE,
  msg_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_usage_own_read" ON public.daily_usage
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_daily_usage_user_date ON public.daily_usage(user_id, date);

-- ── safety_events ──────────────────────────────────────────────────────────────
-- user_id nullable: anonymous users can trigger safety checks.
-- HARD RULE: no DELETE policy — rows are permanent audit records.
CREATE TABLE public.safety_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  message      TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "safety_events_own_read" ON public.safety_events
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_safety_events_user_id ON public.safety_events(user_id);
CREATE INDEX idx_safety_events_created_at ON public.safety_events(created_at DESC);
