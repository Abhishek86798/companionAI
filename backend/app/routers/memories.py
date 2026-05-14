import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.db import supabase
from app.dependencies import require_current_user
from app.models.schemas import MemoriesResponse, MemoryFact

router = APIRouter()


@router.get("/memories", response_model=MemoriesResponse)
async def get_memories(
    user_id: str = Depends(require_current_user),
) -> MemoriesResponse:
    result = (
        supabase.table("memories")
        .select("id, category, fact, created_at, updated_at")
        .eq("user_id", user_id)
        .order("category")
        .execute()
    )
    return MemoriesResponse(
        memories=[MemoryFact(**row) for row in result.data]
    )


@router.delete("/memories/{memory_id}", status_code=204)
async def delete_memory(
    memory_id: uuid.UUID,
    user_id: str = Depends(require_current_user),
) -> None:
    # Verify ownership before deleting
    existing = (
        supabase.table("memories")
        .select("id")
        .eq("id", str(memory_id))
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Memory not found")

    supabase.table("memories").delete().eq("id", str(memory_id)).execute()
