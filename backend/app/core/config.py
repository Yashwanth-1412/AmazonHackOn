from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────────────────────
    APP_ENV: str = Field(default="development")
    APP_PORT: int = Field(default=8000)
    # Allowed CORS origins — comma-separated. Empty = allow all (dev default)
    CORS_ORIGINS: str = Field(default="*")

    # ── LLM ──────────────────────────────────────────────────────────────────
    LLM_PROVIDER: str = Field(default="openrouter")
    LLM_BASE_URL: str = Field(default="https://openrouter.ai/api/v1")
    LLM_API_KEY: str = Field(default="")
    LLM_MODEL: str = Field(default="anthropic/claude-3.5-haiku")
    LLM_SMALL_MODEL: str = Field(default="")

    # ── Embeddings (OpenAI-compatible — swap provider via env) ────────────────
    # Local:  EMBEDDING_PROVIDER=ollama, BASE_URL=http://localhost:11434/v1
    # OpenAI: EMBEDDING_PROVIDER=openai, BASE_URL=https://api.openai.com/v1
    # AWS:    EMBEDDING_PROVIDER=bedrock (future)
    EMBEDDING_PROVIDER: str = Field(default="ollama")
    EMBEDDING_BASE_URL: str = Field(default="http://localhost:11434/v1")
    EMBEDDING_API_KEY: str = Field(default="ollama")
    EMBEDDING_MODEL: str = Field(default="mxbai-embed-large")
    EMBEDDING_DIMENSIONS: int = Field(default=1024)

    # ── Voice Provider ────────────────────────────────────────────────────────
    # "gemini"     → Google Gemini Live (audio + vision)
    # "nova_sonic" → Amazon Nova Sonic (audio only, needs AWS creds)
    VOICE_PROVIDER: str = Field(default="gemini")

    # ── Gemini Live API ───────────────────────────────────────────────────────
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-3.1-flash-live-preview")

    # ── Amazon Nova Sonic (Bedrock) ───────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = Field(default="")
    AWS_SECRET_ACCESS_KEY: str = Field(default="")
    AWS_REGION: str = Field(default="ap-south-1")
    NOVA_SONIC_MODEL: str = Field(default="amazon.nova-sonic-v1:0")

    # ── DynamoDB ──────────────────────────────────────────────────────────────
    # Local dev: set DYNAMODB_ENDPOINT=http://localhost:8001
    # AWS prod:  leave DYNAMODB_ENDPOINT empty → uses real AWS DynamoDB
    DYNAMODB_ENDPOINT: str = Field(default="")
    DYNAMODB_REGION: str = Field(default="ap-south-1")
    # Credentials — leave empty on EC2/ECS to use IAM instance role
    DYNAMODB_ACCESS_KEY: str = Field(default="")
    DYNAMODB_SECRET_KEY: str = Field(default="")

    # ── Catalog Enrichment (Mistral — run offline, not needed at runtime) ────
    ENRICH_API_KEY: str = Field(default="")
    ENRICH_BASE_URL: str = Field(default="https://api.mistral.ai/v1")
    ENRICH_MODEL: str = Field(default="open-mistral-nemo")


settings = Settings()
