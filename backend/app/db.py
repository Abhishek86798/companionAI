from supabase import create_client, Client
from app.config import settings

# Service-role client — bypasses RLS for server-side writes
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)
