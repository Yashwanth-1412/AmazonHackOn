import boto3
from functools import lru_cache
from app.core.config import settings


def _dynamo_kwargs() -> dict:
    """
    Build boto3 kwargs.
    - Local dev: endpoint_url points to DynamoDB Local (http://localhost:8001)
    - AWS production: DYNAMODB_ENDPOINT is empty → boto3 uses real AWS endpoint
    - Credentials: use DYNAMODB_ACCESS_KEY/SECRET if set, else IAM role (EC2/ECS)
    """
    kwargs: dict = {"region_name": settings.DYNAMODB_REGION}

    # Only set endpoint_url for local dev — empty string means real AWS
    if settings.DYNAMODB_ENDPOINT:
        kwargs["endpoint_url"] = settings.DYNAMODB_ENDPOINT

    # Use explicit creds if provided, otherwise rely on IAM role / instance profile
    if settings.DYNAMODB_ACCESS_KEY and settings.DYNAMODB_ACCESS_KEY != "local":
        kwargs["aws_access_key_id"] = settings.DYNAMODB_ACCESS_KEY
        kwargs["aws_secret_access_key"] = settings.DYNAMODB_SECRET_KEY

    return kwargs


@lru_cache(maxsize=1)
def get_dynamodb():
    """DynamoDB resource — works with local Docker and real AWS."""
    return boto3.resource("dynamodb", **_dynamo_kwargs())


@lru_cache(maxsize=1)
def get_dynamodb_client():
    """Low-level DynamoDB client for table management."""
    return boto3.client("dynamodb", **_dynamo_kwargs())


# Singleton
db = get_dynamodb()
