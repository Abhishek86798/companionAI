# Testing
_Last updated: 2026-05-15_

## Backend tests

### Location
`backend/app/tests/` — four test files:
- `test_safety.py` — 55+ cases for the safety/crisis detection service
- `test_rate_limiter.py` — 17 cases for the daily rate limiting service
- `test_memory.py` — 30+ cases for the memory service (extraction, summarization, formatting)
- `test_memories.py` — 10 cases for the memories HTTP router (GET/DELETE endpoints)

### Runner
`pytest` with `pytest-asyncio` plugin. **Note: neither `pytest` nor `pytest-asyncio` appear in `backend/requirements.txt`** — they must be installed separately (e.g. `pip install pytest pytest-asyncio httpx`).

To run all tests from `backend/`:
```powershell
cd backend
.venv\Scripts\activate
pytest app/tests/ -v
```

### Coverage — which services are tested

| Service / module | Test file | Coverage |
|---|---|---|
| `services/safety.py` | `test_safety.py` | High — keyword check, semantic check (mocked), fail-safe on OpenAI error, Devanagari, Romanized Hindi |
| `services/rate_limiter.py` | `test_rate_limiter.py` | High — auth user, anon user, first request (insert), existing row (update), boundary conditions, 429 response |
| `services/memory.py` | `test_memory.py` | High — `get_memories_for_prompt`, `extract_and_store_memories`, `summarize_memories`, `_parse_facts_json` (unit tested directly) |
| `routers/memories.py` | `test_memories.py` | Medium — GET and DELETE endpoints, auth gate, ownership check, 404/422 responses |
| `routers/chat.py` | None | Not tested |
| `services/ai.py` | None | Not tested |
| `services/messages.py` | None | Not tested |
| `dependencies.py` | None | Not tested (only dependency-overridden in router tests) |
| `services/extractor.py` | n/a | Merged into `services/memory.py` |
| `services/summarizer.py` | n/a | Merged into `services/memory.py` |

### Test patterns

**Async tests** (`test_safety.py`, `test_rate_limiter.py`, `test_memory.py`):
- Decorated with `@pytest.mark.asyncio`
- Type-annotated return type `-> None`
- `@pytest.mark.parametrize` used for exhaustive input coverage (25 keyword cases, 25 normal message cases, limit boundary pairs)

**Mocking strategy**:
- All external calls (OpenAI, Supabase) are mocked — no real network calls in any test
- `unittest.mock.AsyncMock` for coroutine mocks (OpenAI `chat.completions.create`)
- `unittest.mock.MagicMock` for Supabase client chains
- `unittest.mock.patch` as context manager (`with patch("app.services.X._openai", mock_client):`)
- Supabase chain helper pattern in `test_rate_limiter.py`:
  ```python
  def _patch_supabase(existing_row_mock):
      mock_client = MagicMock()
      chain = mock_client.table.return_value.select.return_value
      chain.eq.return_value = chain
      chain.maybe_single.return_value.execute.return_value = existing_row_mock
      return patch("app.services.rate_limiter.supabase", mock_client)
  ```

**HTTP router tests** (`test_memories.py`):
- Use `fastapi.testclient.TestClient` (synchronous WSGI test client)
- FastAPI dependency override pattern:
  ```python
  app.dependency_overrides[require_current_user] = lambda: user_id
  app.dependency_overrides[get_current_user] = lambda: user_id
  ```
- `setup_method` / `teardown_method` on test classes to set/clear auth overrides
- Tests grouped in classes (`TestGetMemories`, `TestDeleteMemory`)

**Fail-safe / error path tests**:
- OpenAI exception tests confirm background tasks never raise (mock `side_effect=Exception("timeout")`)
- Safety service fail-safe: OpenAI error → `triggered=True` (conservative default)
- Memory service: OpenAI error or invalid JSON → silent return, no DB call

**Helper factories** (consistent across test files):
- `_make_row(msg_count)` / `_no_row()` — simulate Supabase row presence/absence
- `_db_rows(rows)` / `_db_single(row)` — wrap lists/dicts in MagicMock with `.data`
- `_openai_response(content)` — build mock OpenAI response with `.choices[0].message.content`

### How to run

```powershell
# All tests
cd backend
.venv\Scripts\activate
pytest app/tests/ -v

# Single file
pytest app/tests/test_safety.py -v

# One test by name
pytest app/tests/test_safety.py::test_crisis_keyword_triggers -v

# With coverage (if pytest-cov installed)
pytest app/tests/ --cov=app --cov-report=term-missing
```

---

## Frontend tests

**No tests exist.** `web/package.json` has no test script and no testing libraries installed (no Jest, Vitest, React Testing Library, Playwright, or Cypress).

---

## Critical untested paths

| Path | Risk | Notes |
|---|---|---|
| `POST /api/v1/message` (full chat router) | High | SSE streaming, safety gate integration, cookie setting, background task registration — none tested |
| `services/ai.py` — `stream_response` + `build_system_prompt` | High | No tests for prompt assembly or streaming generator |
| `services/messages.py` — `save_user_message`, `save_assistant_message`, `get_or_create_conversation` | High | DB write paths completely untested |
| `dependencies.py` — `get_current_user` JWT verification + lazy user creation | High | JWT decode paths and lazy `INSERT` into `users` untested |
| `routers/chat.py` — anonymous flow (cookie generation, anon rate limiting) | High | The `new_cookie_value` / `Set-Cookie` header path untested |
| `routers/chat.py` — safety-triggered crisis response stream | Medium | Crisis SSE response path untested |
| Frontend auth flow (OTP send/verify, session handling) | High | No frontend tests at all |
| Frontend SSE stream parsing and error recovery | Medium | `sendMessageStream`, `RateLimitError`, mid-stream disconnect — no tests |

---

## Test data / fixtures

**Backend**:
- `USER_ID = str(uuid.uuid4())` and `MEMORY_ID = str(uuid.uuid4())` — generated fresh at module load in `test_memories.py`
- `_SAMPLE_ROW` dict in `test_memories.py` — reusable memory row fixture
- `_SAMPLE_MESSAGES` list in `test_memory.py` — two-message conversation used for summarizer tests
- No pytest fixtures (`@pytest.fixture`) used anywhere — all setup is done inline or via helper functions
- No fixture files (`conftest.py`) exist

**Frontend**:
- No test data or fixtures (no tests)
