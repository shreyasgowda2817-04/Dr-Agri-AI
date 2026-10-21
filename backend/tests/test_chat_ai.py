import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_chat_status_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/chat/status")
        assert response.status_code == 200
        data = response.json()
        assert "gemini_api_configured" in data
        assert "fallback_models" in data
        assert data.get("offline_agronomy_engine_ready") is True

@pytest.mark.asyncio
async def test_chat_message_fertilizer_query():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat/message", json={
            "message": "What is the best fertilizer for tomato plants?",
            "language": "en-US"
        })
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        assert len(data["reply"]) > 20
        assert "Tomato" in data["reply"]
        assert "19:19:19" in data["reply"] or "NPK" in data["reply"] or "DAP" in data["reply"]

@pytest.mark.asyncio
async def test_chat_message_disease_query():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat/message", json={
            "message": "My chilli leaves are curling downward, what pest or disease is it?",
            "language": "en-US"
        })
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        assert "Chilli" in data["reply"] or "curl" in data["reply"].lower()

@pytest.mark.asyncio
async def test_chat_message_multilingual_hindi():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat/message", json={
            "message": "टमाटर की बीमारी का इलाज",
            "language": "hi-IN"
        })
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        assert len(data["reply"]) > 10

@pytest.mark.asyncio
async def test_chat_message_multilingual_kannada():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat/message", json={
            "message": "ಬೆಳೆ ರೋಗ ನಿರ್ವಹಣೆ",
            "language": "kn-IN"
        })
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        assert len(data["reply"]) > 10
