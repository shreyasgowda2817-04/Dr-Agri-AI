import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_predict_no_auth():
    # Attempting to access protected prediction route without a JWT token
    # should return a 401 Unauthorized
    with open("requirements.txt", "rb") as f:
        response = client.post(
            "/api/v1/ml/predict",
            files={"file": ("test.txt", f, "text/plain")}
        )
    assert response.status_code == 401

# Further tests would require a valid JWT token injected via FastAPI dependency_overrides
# and mocking the ML service to prevent loading the actual .keras model during CI.
