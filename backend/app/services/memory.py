from app.db import supabase

_CATEGORY_LABELS = {
    "name":         "Name",
    "city":         "City",
    "job":          "Job",
    "relationship": "Relationships",
    "situation":    "Current situation",
    "other":        "Other",
}


async def get_memory_facts(user_id: str) -> str:
    """Return a formatted string of memory facts for injection into the system prompt."""
    result = (
        supabase.table("memories")
        .select("category, fact")
        .eq("user_id", user_id)
        .order("category")
        .execute()
    )

    rows = result.data
    if not rows:
        return "No information yet about this person."

    lines = [
        f"- {_CATEGORY_LABELS.get(row['category'], row['category'])}: {row['fact']}"
        for row in rows
    ]
    return "\n".join(lines)
