# Tech Stack
_Last updated: 2026-05-15_

## Backend
- Runtime: Python 3.11
- Framework: FastAPI 0.111.1 (ASGI via Uvicorn 0.30.1 with standard extras)
- Key libraries:
  - `pydantic-settings` 2.3.4 — typed config from env; single `settings` singleton in `config.py`
  - `supabase` 2.5.0 — Postgres client using service role key (bypasses RLS); also used for auth token network fallback
  - `openai` 1.35.7 — OpenAI Python SDK pointed at OpenRouter proxy
  - `sentry-sdk[fastapi]` 2.7.1 — error tracking; conditional on `SENTRY_DSN`
  - `python-multipart` 0.0.9 — form/file upload support
  - `PyJWT` (transitive) — local JWT decode (HS256); RS256 falls back to `supabase.auth.get_user()` network call
- Python version: 3.11

## Frontend
- Framework: Next.js 16.2.6 (App Router) — NOTE: has breaking changes vs 14.x; read `node_modules/next/dist/docs/` before writing routing or data-fetching code
- Language: TypeScript 5.x
- Key libraries:
  - `@supabase/supabase-js` ^2.105.4 — client-side auth (OTP/magic-link) and direct DB access
  - `@tanstack/react-query` ^5.100.10 — server state management / data fetching
  - `react` 19.2.4 / `react-dom` 19.2.4
  - `tailwindcss` ^4 — Tailwind v4 (no config file; uses `@tailwindcss/postcss`)
  - `babel-plugin-react-compiler` 1.0.0 — React compiler optimization
  - `eslint` ^9 + `eslint-config-next` 16.2.6
- Build tool: Next.js built-in (SWC/Webpack)

## Infrastructure
- Database: Supabase (Postgres 15.x) — tables: `users`, `messages`, `memories`, `conversations`, `daily_usage`, `safety_events`
- Auth: Supabase Auth — OTP flow (email magic link; phone SMS not yet configured). Frontend calls Supabase JS SDK directly; backend verifies JWTs locally (HS256) or via network fallback.
- Hosting:
  - Backend: Railway (FastAPI/Uvicorn)
  - Frontend: Vercel (Next.js, auto-deploy on push to main)
  - Database + Auth: Supabase cloud
- AI/LLM:
  - Provider: OpenRouter (`https://openrouter.ai/api/v1`)
  - Model: `openai/gpt-4o-mini`
  - Uses: chat completions (streaming SSE, max 300 tokens, temp 0.8), safety semantic classification (max 5 tokens, temp 0), memory extraction and summarization (non-streaming)

## Dev tooling
- Backend server: `uvicorn app.main:app --reload --port 8000` (Windows venv: `.venv\Scripts\activate`)
- Frontend server: `npm run dev` → http://localhost:3000
- Type check (frontend): `npx tsc --noEmit`
- Lint: `npm run lint` (ESLint 9)
- DB migrations: Supabase MCP tool (`mcp__supabase__apply_migration`) or Supabase Management REST API
- Error tracking: Sentry (backend only; opt-in via `SENTRY_DSN`)
