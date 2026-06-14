"""AWS Configuration for Voice Feature."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class AWSVoiceSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # AWS
    AWS_REGION: str = Field(default="ap-south-1")
    AWS_ACCESS_KEY_ID: str = Field(default="local")
    AWS_SECRET_ACCESS_KEY: str = Field(default="local")
    AWS_ENDPOINT_URL: str = Field(default="http://localhost:4566")

    # Transcribe Streaming
    TRANSCRIBE_LANGUAGE_CODE: str = Field(default="en-IN")
    TRANSCRIBE_SAMPLE_RATE: int = Field(default=16000)
    TRANSCRIBE_ENCODING: str = Field(default="pcm")
    TRANSCRIBE_VOCABULARY_NAME: str = Field(default="")

    # Bedrock
    BEDROCK_MODEL_ID: str = Field(default="anthropic.claude-3-5-haiku-20241022-v1:0")
    BEDROCK_MAX_TOKENS: int = Field(default=1000)
    BEDROCK_TEMPERATURE: float = Field(default=0.1)

    # Feature flags
    USE_MOCK_TRANSCRIBE: bool = Field(default=True)
    USE_MOCK_BEDROCK: bool = Field(default=True)


aws_voice_settings = AWSVoiceSettings()