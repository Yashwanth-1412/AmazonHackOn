"""Transcribe Streaming client for real-time speech-to-text."""

import asyncio
import json
import base64
from typing import AsyncGenerator, Optional
from dataclasses import dataclass

import boto3
from botocore.config import Config

from app.core.aws.config import aws_voice_settings


@dataclass
class TranscribeResult:
    transcript: str
    is_final: bool
    confidence: float = 0.0
    items: list[dict] = None


class TranscribeStreamingClient:
    def __init__(self):
        self.client = None
        self.stream = None
        self._init_client()

    def _init_client(self):
        if not aws_voice_settings.USE_MOCK_TRANSCRIBE:
            self.client = boto3.client(
                "transcribestreaming",
                region_name=aws_voice_settings.AWS_REGION,
                endpoint_url=aws_voice_settings.AWS_ENDPOINT_URL if aws_voice_settings.AWS_ENDPOINT_URL != "http://localhost:4566" else None,
                aws_access_key_id=aws_voice_settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=aws_voice_settings.AWS_SECRET_ACCESS_KEY,
                config=Config(retries={"max_attempts": 3}),
            )

    async def start_stream(self) -> "TranscribeStream":
        if aws_voice_settings.USE_MOCK_TRANSCRIBE:
            return MockTranscribeStream()
        return RealTranscribeStream(self.client)

    async def close(self):
        pass


class TranscribeStream:
    async def send_audio(self, audio_chunk: bytes):
        raise NotImplementedError

    async def __aiter__(self) -> AsyncGenerator[TranscribeResult, None]:
        raise NotImplementedError

    async def close(self):
        raise NotImplementedError


class MockTranscribeStream(TranscribeStream):
    """Mock transcribe stream for local development."""

    def __init__(self):
        self._queue: asyncio.Queue = asyncio.Queue()
        self._closed = False
        self._test_transcripts = [
            "add 1 liter milk",
            "add 2 bananas and 500 grams bread",
            "add milk and eggs",
            "remove milk from cart",
        ]
        self._index = 0

    async def send_audio(self, audio_chunk: bytes):
        """Simulate processing audio - trigger result after some chunks."""
        pass

    def _get_next_transcript(self) -> Optional[str]:
        if self._index < len(self._test_transcripts):
            t = self._test_transcripts[self._index]
            self._index += 1
            return t
        return None

    async def __aiter__(self) -> AsyncGenerator[TranscribeResult, None]:
        # Simulate streaming results
        await asyncio.sleep(0.5)
        transcript = self._get_next_transcript()
        if transcript:
            # Send interim results
            words = transcript.split()
            for i in range(1, len(words) + 1):
                interim = " ".join(words[:i])
                yield TranscribeResult(
                    transcript=interim,
                    is_final=False,
                    confidence=0.5,
                )
                await asyncio.sleep(0.15)

            # Send final result
            yield TranscribeResult(
                transcript=transcript,
                is_final=True,
                confidence=0.95,
            )

    async def close(self):
        self._closed = True


class RealTranscribeStream(TranscribeStream):
    """Real AWS Transcribe Streaming implementation."""

    def __init__(self, client):
        self.client = client
        self._response = None
        self._event_stream = None

    async def start(self):
        self._response = await self.client.start_stream_transcription(
            LanguageCode=aws_voice_settings.TRANSCRIBE_LANGUAGE_CODE,
            MediaSampleRateHertz=aws_voice_settings.TRANSCRIBE_SAMPLE_RATE,
            MediaEncoding=aws_voice_settings.TRANSCRIBE_ENCODING,
        )
        self._event_stream = self._response["TranscriptResultStream"]

    async def send_audio(self, audio_chunk: bytes):
        if self._event_stream:
            await self._event_stream.send_audio_event(AudioChunk=audio_chunk)

    async def __aiter__(self) -> AsyncGenerator[TranscribeResult, None]:
        async for event in self._event_stream:
            if "TranscriptEvent" in event:
                results = event["TranscriptEvent"]["Transcript"]["Results"]
                for result in results:
                    alternatives = result.get("Alternatives", [])
                    if alternatives:
                        alt = alternatives[0]
                        yield TranscribeResult(
                            transcript=alt.get("Transcript", ""),
                            is_final=not result.get("IsPartial", True),
                            confidence=alt.get("Confidence", 0.0),
                            items=alt.get("Items", []),
                        )

    async def close(self):
        if self._event_stream:
            await self._event_stream.end_stream()


transcribe_client = TranscribeStreamingClient()