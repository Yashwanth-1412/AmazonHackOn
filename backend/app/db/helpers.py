"""Thin helpers around DynamoDB tables — used by all routers."""

from decimal import Decimal
from app.db.client import db


def _serialize(obj):
    """Recursively convert Decimal → float for JSON responses."""
    if isinstance(obj, list):
        return [_serialize(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, Decimal):
        return float(obj)
    return obj


def table(name: str):
    return db.Table(name)
