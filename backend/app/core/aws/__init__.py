"""AWS module — Nova Sonic bidirectional streaming client."""

from app.core.aws.nova_sonic_client import NovaSonicClient, NovaSonicQuotaError

__all__ = [
    "NovaSonicClient",
    "NovaSonicQuotaError",
]
