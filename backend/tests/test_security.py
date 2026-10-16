import pytest
from datetime import timedelta
import jwt
from app.core.security import (
    get_password_hash,
    verify_password,
    hash_token,
    create_access_token,
    create_refresh_token,
    decode_token,
)

def test_password_hashing_and_verification():
    password = "FarmerSecretPassword@2026"
    hashed = get_password_hash(password)

    # Hash should not equal plain password
    assert hashed != password
    # Valid password verification
    assert verify_password(password, hashed) is True
    # Incorrect password verification
    assert verify_password("WrongPassword123", hashed) is False

def test_token_hashing_sha256():
    token = "sample-session-token-xyz"
    hashed1 = hash_token(token)
    hashed2 = hash_token(token)

    assert len(hashed1) == 64  # SHA-256 output length
    assert hashed1 == hashed2
    assert hashed1 != hash_token("different-token")

def test_access_token_creation_and_decoding():
    user_id = "farmer-user-456"
    token = create_access_token(user_id, expires_delta=timedelta(minutes=15))

    decoded = decode_token(token)
    assert decoded["sub"] == user_id
    assert decoded["type"] == "access"
    assert "exp" in decoded

def test_refresh_token_creation_and_decoding():
    user_id = "farmer-user-789"
    token = create_refresh_token(user_id)

    decoded = decode_token(token)
    assert decoded["sub"] == user_id
    assert decoded["type"] == "refresh"
    assert "jti" in decoded
    assert "exp" in decoded

def test_expired_or_invalid_token():
    # Token with negative expiry (expired)
    expired_token = create_access_token("test-user", expires_delta=timedelta(minutes=-5))
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_token(expired_token)
