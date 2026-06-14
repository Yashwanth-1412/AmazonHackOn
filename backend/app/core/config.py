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
    LLM_SMALL_MODEL: str = Field(default="")

    # ── Embeddings (OpenAI-compatible) ───────────────────────────────────────
    EMBEDDING_PROVIDER: str = Field(default="ollama", description="openai | ollama | lmstudio | custom")
    EMBEDDING_BASE_URL: str = Field(default="http://localhost:11434/v1")
    EMBEDDING_API_KEY: str = Field(default="ollama")
    EMBEDDING_MODEL: str = Field(default="mxbai-embed-large")
    EMBEDDING_DIMENSIONS: int = Field(default=1024)

    # ── Voice provider ────────────────────────────────────────────────────────
    # "gemini"     → Google Gemini Live API (default, works now)
    # "nova_sonic" → Amazon Nova Sonic (swap when AWS creds are ready)
    VOICE_PROVIDER: str = Field(default="gemini", description="gemini | nova_sonic")

    # ── Gemini Live API ───────────────────────────────────────────────────────
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-3.1-flash-live-preview")

    # ── Amazon Nova Sonic (Bedrock) ───────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = Field(default="")
    AWS_SECRET_ACCESS_KEY: str = Field(default="")
    AWS_REGION: str = Field(default="ap-south-1")
    NOVA_SONIC_MODEL: str = Field(default="amazon.nova-sonic-v1:0")

    # ── Catalog enrichment LLM ────────────────────────────────────────────────
    ENRICH_API_KEY: str = Field(default="")
    ENRICH_BASE_URL: str = Field(default="https://api.mistral.ai/v1")
    ENRICH_MODEL: str = Field(default="open-mistral-nemo")

    # ── DynamoDB ─────────────────────────────────────────────────────────────
    DYNAMODB_ENDPOINT: str = Field(default="http://localhost:8001")
    DYNAMODB_REGION: str = Field(default="ap-south-1")
    DYNAMODB_ACCESS_KEY: str = Field(default="local")
    DYNAMODB_SECRET_KEY: str = Field(default="local")

    # ── App ───────────────────────────────────────────────────────────────────
    APP_ENV: str = Field(default="development")
    APP_PORT: int = Field(default=8000)


settings = Settings()
