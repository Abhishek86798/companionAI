from fastapi import APIRouter, Depends

from app.db import supabase
from app.dependencies import require_current_user
from app.models.schemas import PersonaResponse, PersonaUpsert, _VALID_LANGS

router = APIRouter()

_DEFAULTS = PersonaResponse(
    companion_name="Arjun",
    tone=None,
    expectation=None,
    open_field=None,
    language_pref="hinglish",
)


@router.get("/persona", response_model=PersonaResponse)
async def get_persona(
    user_id: str = Depends(require_current_user),
) -> PersonaResponse:
    result = (
        supabase.table("persona")
        .select("companion_name, tone, expectation, open_field, language_pref")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not result:
        return _DEFAULTS
    return PersonaResponse(**result.data)


@router.post("/persona", response_model=PersonaResponse)
async def upsert_persona(
    body: PersonaUpsert,
    user_id: str = Depends(require_current_user),
) -> PersonaResponse:
    payload: dict = {"user_id": user_id}
    if body.companion_name is not None:
        payload["companion_name"] = body.companion_name or "Arjun"
    if body.tone is not None:
        payload["tone"] = body.tone
    if body.expectation is not None:
        payload["expectation"] = body.expectation
    if body.open_field is not None:
        payload["open_field"] = body.open_field
    if body.language_pref is not None and body.language_pref in _VALID_LANGS:
        payload["language_pref"] = body.language_pref

    supabase.table("persona").upsert(payload, on_conflict="user_id").execute()
    result = (
        supabase.table("persona")
        .select("companion_name, tone, expectation, open_field, language_pref")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return PersonaResponse(**result.data)
