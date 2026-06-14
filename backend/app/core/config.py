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

    # ── Embeddings (OpenAI-compatible) ───────────────────────────────────────
    # Works with: OpenAI, Ollama, LM Studio, local servers, etc.
    EMBEDDING_PROVIDER: str = Field(default="openai", description="openai | ollama | lmstudio | custom")
    EMBEDDING_BASE_URL: str = Field(default="https://api.openai.com/v1")
    EMBEDDING_API_KEY: str = Field(default="")
    EMBEDDING_MODEL: str = Field(default="mxbai-embed-large")
    EMBEDDING_DIMENSIONS: int = Field(default=1024, description="Embedding dimensions (1024 for mxbai-embed-large, 1536 for openai, 384 for all-minilm)")

    # ── Gemini Live API (for Ramble voice) ───────────────────────────────────
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash", description="Gemini model for Live API")

    # ── DynamoDB ─────────────────────────────────────────────────────────────
    DYNAMODB_ENDPOINT: str = Field(default="http://localhost:8001")
    DYNAMODB_REGION: str = Field(default="ap-south-1")
    DYNAMODB_ACCESS_KEY: str = Field(default="local")
    DYNAMODB_SECRET_KEY: str = Field(default="local")

    # ── App ───────────────────────────────────────────────────────────────────
    APP_ENV: str = Field(default="development")
    APP_PORT: int = Field(default=8000)


settings = Settings()
