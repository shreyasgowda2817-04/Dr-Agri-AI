import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_register_user_mock():
    # In a real environment, this would hit a test database.
    # For now, we ensure the route is correctly wired and handles validation.
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "T", "email": "invalid-email", "password": "123", "role": "Farmer"}
    )
    # Should fail pydantic validation for email and password length
    assert response.status_code == 422 

def test_login_no_credentials():
    response = client.post("/api/v1/auth/login")
    # Missing form data
    assert response.status_code == 422
