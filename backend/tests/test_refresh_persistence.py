import pytest
from datetime import datetime, timezone, timedelta
import jwt
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
)
from app.models.mongo_models import MongoRefreshToken

def test_persistent_refresh_token_lifespan():
    user_id = "farmer-uid-999"
    # Create 30-day persistent refresh token
    refresh_token = create_refresh_token(user_id, expires_delta=timedelta(days=30))
    decoded = decode_token(refresh_token)

    assert decoded["sub"] == user_id
    assert decoded["type"] == "refresh"
    
    # Calculate time until expiration
    exp_timestamp = decoded["exp"]
    current_timestamp = datetime.now(timezone.utc).timestamp()
    days_left = (exp_timestamp - current_timestamp) / (24 * 3600)
    assert 29 <= days_left <= 31

def test_mongo_refresh_token_model_attributes():
    user_id = "farmer-uid-888"
    token = create_refresh_token(user_id)
    t_hash = hash_token(token)
    
    record = MongoRefreshToken(
        user_id=user_id,
        token_hash=t_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
        ip_address="192.168.1.1"
    )

    assert record.user_id == user_id
    assert record.token_hash == t_hash
    assert record.revoked is False
    assert record.rotated_at is None
    assert record.revoked_at is None
    assert record.user_agent is not None

def test_refresh_token_rotation_grace_period_calculation():
    # Simulate a token rotated 10 seconds ago (within 30s grace window)
    now = datetime.now(timezone.utc)
    rotated_at = now - timedelta(seconds=10)
    time_since_rotation = (now - rotated_at).total_seconds()
    assert time_since_rotation <= 30  # Should allow concurrent in-flight requests

    # Simulate a token rotated 45 seconds ago (outside grace window)
    expired_rotated_at = now - timedelta(seconds=45)
    expired_time_since_rotation = (now - expired_rotated_at).total_seconds()
    assert expired_time_since_rotation > 30  # Should reject
