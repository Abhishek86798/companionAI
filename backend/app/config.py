from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    openai_api_key: str
    openai_base_url: str = "https://api.openai.com/v1"
    supabase_jwt_secret: str = ""
    sentry_dsn: str = ""
    environment: str = "development"
    allowed_origins: str = "http://localhost:3000"
    free_tier_daily_limit: int = 20
    anon_msg_limit: int = 8

    model_config = {"env_file": ".env"}


settings = Settings()
