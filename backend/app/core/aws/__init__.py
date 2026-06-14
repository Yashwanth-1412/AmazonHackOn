"""AWS Voice Services Package."""

from app.core.aws.config import aws_voice_settings
from app.core.aws.bedrock import bedrock_client, BedrockClient
from app.core.aws.transcribe import transcribe_client, TranscribeStreamingClient, TranscribeResult

__all__ = [
    "aws_voice_settings",
    "bedrock_client",
    "BedrockClient",
    "transcribe_client",
    "TranscribeStreamingClient",
    "TranscribeResult",
]