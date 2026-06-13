from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── LLM ──────────────────────────────────────────────────────────────────
    LLM_PROVIDER: str = Field(default="openrouter", description="openrouter | github | openai | bedrock")
    LLM_BASE_URL: str = Field(default="https://openrouter.ai/api/v1")
    LLM_API_KEY: str = Field(default="")
    LLM_MODEL: str = Field(default="anthropic/claude-3.5-haiku")

    # Optional: small/fast model for lightweight tasks (reminders, scoring)
    LLM_SMALL_MODEL: str = Field(default="")

    # ── App ───────────────────────────────────────────────────────────────────
    APP_ENV: str = Field(default="development")
    APP_PORT: int = Field(default=8000)


settings = Settings()
