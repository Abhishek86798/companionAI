# Conventions
_Last updated: 2026-05-15_

## Python / Backend

### Code style
- Python 3.11; no formatter config found (no Black/Ruff config), but code is clean and consistently styled
- Type annotations on all function signatures, including return types (`-> Optional[str]`, `-> None`, etc.)
- `Optional[X]` from `typing` (not `X | None` union syntax), consistent with Python 3.11 but older style
- Module-level docstrings on service files and test files describing what the module covers
- Section dividers use `# ── Section name ─────` comment lines to separate logical groups within a file
- Module-private names prefixed with `_` (e.g. `_openai`, `_bearer`, `_CRISIS_KEYWORDS`, `_parse_facts_json`)
- Constants defined at module top level in SCREAMING_SNAKE_CASE (`_SYSTEM_TEMPLATE`, `_MODEL`, `_VALID_CATEGORIES`)

### Import order
1. Standard library (`json`, `datetime`, `typing`, `dataclasses`, `uuid`, `logging`)
2. Third-party (`fastapi`, `openai`, `pyjwt`, `sentry_sdk`, `pydantic`)
3. Internal app imports (`from app.config import settings`, `from app.db import supabase`, `from app.services.X import Y`)

### Naming
- Files: `snake_case.py`
- Functions/variables: `snake_case`
- Classes: `PascalCase` (e.g. `SafetyResult`, `Settings`, `MessageRequest`)
- Constants: `SCREAMING_SNAKE_CASE` or `_SCREAMING_SNAKE_CASE` when module-private
- FastAPI routers: `router = APIRouter()` at module level; no prefix set on the router itself (prefix is in `main.py`)

### Error handling patterns
- Background tasks (`extract_and_store_memories`, `summarize_memories`) use bare `except Exception: return` — silent failure, never crash the request flow
- Auth dependencies raise `HTTPException` with appropriate status codes (401, 403)
- Rate limiter raises `HTTPException(status_code=429, ...)`
- JWT errors are caught by type: `ExpiredSignatureError` → 401 "Token expired", `InvalidTokenError` → 401 "Invalid token"
- `logger.warning(...)` used for non-fatal auth failures before raising
- DB errors are generally not caught (let them propagate as 500)

### Async patterns
- All service functions that call OpenAI or Supabase are `async def`
- Supabase client calls (from `supabase-py`) are synchronous even inside `async` functions (the library does not provide async client)
- OpenAI calls use `AsyncOpenAI` with `await`
- Background tasks registered via `background_tasks.add_task(fn, *args)` in router handlers
- SSE streaming via `async def generate()` inner generator function inside the route handler, returned as `StreamingResponse`
- `AsyncGenerator[str, None]` return type used for streaming AI response in `ai.py`

### Pydantic usage
- Settings: `pydantic_settings.BaseSettings` with `model_config = {"env_file": ".env"}`; single `settings` singleton instantiated at module level
- Request/response schemas in `app/models/schemas.py`: `pydantic.BaseModel` subclasses
- `Optional[UUID]` fields default to `None` in request models
- Response models use `UUID` and `datetime` types directly (Pydantic serializes them)
- `dataclass` (stdlib) used for simple return types that don't need serialization (e.g. `SafetyResult`)

### Singleton pattern
- Supabase client: `supabase = create_client(...)` at module level in `db.py`, imported directly
- OpenAI client: `_openai = AsyncOpenAI(...)` at module level in each service that needs it (`ai.py`, `memory.py`, `safety.py`)
- Settings: `settings = Settings()` at module level in `config.py`

---

## TypeScript / Frontend

### Component patterns
- All page and component files use `"use client"` directive at the top
- Default exports for page components (`export default function PageName()`)
- Named exports for reusable components when they export types alongside (`export interface ChatMessage`, `export default function ChatBubble`)
- Props typed inline as function parameters: `{ message }: { message: ChatMessage }` or via destructuring
- Inner helper functions (non-component) defined at the bottom of the file after the component, or as module-level functions above the component

### State management
- Local `useState` for component-scoped state; no global state library (Redux/Zustand/etc.)
- React Context for cross-cutting concerns: `AuthContext` (session/user/isLoading/signOut) and `ToastContext`
- `useRef` for values that should not trigger re-renders (e.g. `hadSession` to detect session expiry)
- `useCallback` for event handlers passed as props to prevent unnecessary re-renders
- Streaming state accumulated by appending tokens: `setMessages(prev => prev.map(m => m.id === id ? {...m, content: m.content + token} : m))`

### API calls
- All API calls go through `web/lib/chat.ts` (SSE streaming) or `web/lib/api.ts`
- `fetch()` always includes `credentials: "include"` for the anon session cookie
- `Authorization: Bearer <token>` header set when `session.access_token` is available
- `NEXT_PUBLIC_API_URL` env var (includes `/api/v1`); falls back to `http://localhost:8000/api/v1`
- SSE parsing: read `ReadableStream`, split on `\n\n`, extract `data: ` prefix, `JSON.parse` the payload
- Custom error class `RateLimitError extends Error` for 429 responses with `detail` payload
- Supabase JS SDK called directly from frontend for auth (`supabase.auth.signInWithOtp`, `supabase.auth.verifyOtp`)

### Naming conventions
- Files: `PascalCase.tsx` for components and pages (`ChatBubble.tsx`, `MessageList.tsx`)
- Files: `camelCase.ts` for utilities and lib modules (`chat.ts`, `supabase.ts`)
- Interfaces/types: `PascalCase` (`ChatMessage`, `SSEDoneEvent`, `HistoryResponse`)
- Discriminated union types with `type` literal field: `SSETokenEvent | SSEDoneEvent | SSEErrorEvent`
- Boolean state variables: `isLoading`, `isStreaming`, `isLimited`, `isCrisis`
- localStorage keys: `arjun_` prefix (`arjun_intake`, `arjun_onboarding_done`, `arjun_first_sent`, `arjun_lang_pref`)

### File organization
```
web/
├── app/              — Next.js App Router pages (each page.tsx is a route)
│   ├── page.tsx      — Root redirect logic
│   ├── auth/         — Auth page
│   ├── chat/         — Chat page
│   ├── onboarding/   — Onboarding wizard
│   └── settings/     — Settings page
├── components/
│   └── chat/         — Chat UI components (ChatBubble, ChatInput, MessageList, VoiceButton)
├── context/          — React Contexts (AuthContext, ToastContext)
└── lib/              — Utilities (chat.ts for SSE, supabase.ts for client, api.ts)
```

### Styling
- Tailwind CSS v4 utility classes
- CSS custom properties (`var(--color-primary)`, `var(--color-bg)`, `var(--color-surface)`, etc.) used for theming — never hardcoded hex colors except in gradients
- Inline `style` prop used alongside className when Tailwind classes are insufficient
- `min-height: 44px` on interactive elements for touch accessibility

---

## Git

### Commit style (from git log)
- Format: `feat: Phase X.Y — short description` for feature work
- `fix: short description` for bug fixes
- `setup` prefix for tooling/workflow setup commits
- Phase number referenced in commit message (e.g. `Phase 5.1 — safety service`)
- Em dash (`—`) used as separator between phase number and description
- No ticket/issue references in commit messages
- Single-line commit messages (no body)

---

## Patterns to follow

- **Fail-safe for background AI calls**: wrap OpenAI calls in `try/except Exception: return` so errors never surface to the user
- **Supabase chain pattern**: `supabase.table("x").select("col").eq("field", val).maybe_single().execute()` for nullable single-row lookups
- **Dependency injection for auth**: route handlers declare `user_id: Optional[str] = Depends(get_current_user)` or `user_id: str = Depends(require_current_user)`; never extract user from request body
- **SSE event shape**: always `{"type": "token"|"done"|"error", ...}` with `_sse(payload)` helper in `chat.py`
- **Deduplication before upsert**: `{r["category"]: r for r in rows}.values()` to deduplicate by category before writing memories
- **Markdown fence stripping**: check `raw.startswith("```")` and strip before JSON parsing
- **React Context hook pattern**: context created with sensible defaults, `use<Context>` hook exported (`useAuth`, `useToast`)
- **Type narrowing with `instanceof`**: `err instanceof RateLimitError` before generic catch handling

## Anti-patterns observed

- OpenAI client instantiated at module level in multiple service files (`ai.py`, `memory.py`, `safety.py`) — if settings change this requires restart; acceptable for now but note the coupling
- `requirements.txt` has no `pytest`, `pytest-asyncio`, or `httpx` — test dependencies are not pinned (they must be installed separately; missing from the requirements file)
- `get_recent_messages` is called both in `ai.py` (to build history) and in `chat.py` (to get history for background tasks) — slight duplication; the history fetched in `chat.py` is passed to background tasks rather than re-fetched in `ai.py` which only re-fetches it internally
- No `pyproject.toml` — no unified Python project config; no linter (Ruff/Flake8) or formatter (Black) configured
- `web/package.json` has no test script — frontend testing not set up at all
