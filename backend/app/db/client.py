import boto3
from functools import lru_cache
from app.core.config import settings


@lru_cache(maxsize=1)
def get_dynamodb():
    """DynamoDB resource — works with local and AWS."""
    return boto3.resource(
        "dynamodb",
        endpoint_url=settings.DYNAMODB_ENDPOINT,
        region_name=settings.DYNAMODB_REGION,
        aws_access_key_id=settings.DYNAMODB_ACCESS_KEY,
        aws_secret_access_key=settings.DYNAMODB_SECRET_KEY,
    )


@lru_cache(maxsize=1)
def get_dynamodb_client():
    """Low-level DynamoDB client for table management."""
    return boto3.client(
        "dynamodb",
        endpoint_url=settings.DYNAMODB_ENDPOINT,
        region_name=settings.DYNAMODB_REGION,
        aws_access_key_id=settings.DYNAMODB_ACCESS_KEY,
        aws_secret_access_key=settings.DYNAMODB_SECRET_KEY,
    )


# Singleton
db = get_dynamodb()
