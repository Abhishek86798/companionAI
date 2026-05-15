-- Rate-limit anonymous users by session cookie instead of user_id.
-- anon_session_id is a UUID set as an HttpOnly cookie by the backend on first
-- unauthenticated request (see chat.py); limited to ANON_MSG_LIMIT per day.
ALTER TABLE public.daily_usage ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.daily_usage ADD COLUMN IF NOT EXISTS anon_session_id TEXT;

-- Partial unique index: one row per anon session per calendar day.
-- WHERE clause excludes authenticated rows so the existing UNIQUE(user_id, date)
-- constraint continues to handle the auth path.
CREATE UNIQUE INDEX idx_daily_usage_anon_date
  ON public.daily_usage(anon_session_id, date)
  WHERE anon_session_id IS NOT NULL;
