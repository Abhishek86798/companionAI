---
id: 04B-PLAN-02
title: "Backend schemas + persona router"
wave: 1
depends_on: []
files_modified:
  - backend/app/models/schemas.py
  - backend/app/routers/persona.py
  - backend/app/main.py
autonomous: true
must_haves:
  truths:
    - "PersonaUpsert and PersonaResponse Pydantic models exist in schemas.py"
    - "GET /api/v1/persona returns 200 with PersonaResponse for authenticated user"
    - "GET /api/v1/persona returns default {companion_name: 'Arjun', tone: null, expectation: null} when no DB row exists (never writes a row)"
    - "POST /api/v1/persona upserts the persona row and returns PersonaResponse"
    - "GET and POST /api/v1/persona return 401 for unauthenticated requests"
    - "persona router is registered in main.py with prefix /api/v1"
  commands:
    - "curl -s http://localhost:8000/api/v1/persona | python3 -c \"import sys,json; d=json.load(sys.stdin); assert d['companion_name']=='Arjun'\""
    - "curl -s http://localhost:8000/api/v1/persona -H 'Authorization: Bearer INVALID' | python3 -c \"import sys,json; d=json.load(sys.stdin); assert d.get('detail')=='Authentication required'\""
---

## Objective

Add two Pydantic schemas and a new persona router implementing GET and POST /api/v1/persona. The GET endpoint returns a default response when no DB row exists — it never inserts a default row. The POST endpoint upserts using supabase-py. Pattern mirrors backend/app/routers/memories.py exactly.

## Tasks

### Task 1: Add Pydantic schemas to schemas.py

<read_first>
- backend/app/models/schemas.py (reason: understand existing model style — field types, Optional usage, datetime imports)
</read_first>

<action>
Append two new classes to backend/app/models/schemas.py after the MemoriesResponse class.

PersonaUpsert(BaseModel) fields:
  companion_name: str — required, the companion display name
  tone: Optional[str] = None — user-defined tone descriptor
  expectation: Optional[str] = None — user expectation text
  open_field: Optional[str] = None — freeform additional context

PersonaResponse(BaseModel) fields:
  companion_name: str
  tone: Optional[str] = None
  expectation: Optional[str] = None
  open_field: Optional[str] = None
  created_at: Optional[datetime] = None
  updated_at: Optional[datetime] = None

Import Optional from typing is already present. datetime is already imported.
</action>

<acceptance_criteria>
- python3 -c "from app.models.schemas import PersonaUpsert, PersonaResponse; print('ok')" exits 0 from backend/ directory
- PersonaUpsert(companion_name='Kai').model_dump() returns dict with tone=None, expectation=None, open_field=None
</acceptance_criteria>

### Task 2: Create backend/app/routers/persona.py

<read_first>
- backend/app/routers/memories.py (reason: exact pattern to follow — APIRouter, Depends, supabase.table, require_current_user, HTTPException)
- backend/app/db.py (reason: confirm supabase client import path)
- backend/app/dependencies.py (reason: confirm require_current_user import)
</read_first>

<action>
Create backend/app/routers/persona.py.

Imports: APIRouter, Depends, HTTPException from fastapi; supabase from app.db; require_current_user from app.dependencies; PersonaUpsert, PersonaResponse from app.models.schemas.

router = APIRouter()

GET /persona endpoint:
  - Depends on require_current_user to get user_id (str)
  - Query: supabase.table("persona").select("companion_name, tone, expectation, open_field, created_at, updated_at").eq("user_id", user_id).maybe_single().execute()
  - If result.data is None: return PersonaResponse(companion_name="Arjun") — do NOT insert
  - Else: return PersonaResponse(**result.data)
  - response_model=PersonaResponse

PUT /persona endpoint:
  - Body: body: PersonaUpsert
  - Depends on require_current_user to get user_id
  - Build row dict: {"user_id": user_id, "companion_name": body.companion_name, "tone": body.tone, "expectation": body.expectation, "open_field": body.open_field}
  - Call: supabase.table("persona").upsert(row, on_conflict="user_id").execute()
  - Re-fetch with .maybe_single().execute() to get server-set timestamps
  - Return PersonaResponse(**result.data)
  - response_model=PersonaResponse

Do NOT implement DELETE. Do NOT implement PATCH. Only GET and PUT.
</action>

<acceptance_criteria>
- File backend/app/routers/persona.py exists and imports without error
- python3 -c "from app.routers.persona import router; print(len(router.routes))" prints 2 from backend/ directory
- GET /api/v1/persona without auth returns HTTP 401
- PUT /api/v1/persona without auth returns HTTP 401
</acceptance_criteria>

### Task 3: Register persona router in main.py

<read_first>
- backend/app/main.py (reason: see exact pattern used for memories router registration)
</read_first>

<action>
In backend/app/main.py:
  1. Add import: from app.routers import persona  (after the existing memories import on line 5)
  2. Add: app.include_router(persona.router, prefix="/api/v1")  (after the memories router registration on line 25)

No other changes to main.py.
</action>

<acceptance_criteria>
- python3 -c "from app.main import app; routes = [r.path for r in app.routes]; assert '/api/v1/persona' in routes; print('ok')" exits 0
- GET http://localhost:8000/api/v1/persona with a valid token returns JSON with companion_name field
- GET http://localhost:8000/openapi.json shows /api/v1/persona in the paths object
</acceptance_criteria>
