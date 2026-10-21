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

@pytest.mark.asyncio
async def test_chat_message_educational_what_is_crops():
    """Verify that educational queries are answered directly without asking for crop details."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat/message", json={
            "message": "what is crops",
            "language": "en-US"
        })
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        reply = data["reply"].lower()
        # Should explain what a crop is
        assert "cultivated" in reply or "plant" in reply or "food" in reply
        # Should not blindly ask "could you provide more details about the crop you are growing" as the only answer
        assert "could you provide more details about the crop you are growing" not in reply

@pytest.mark.asyncio
async def test_chat_message_fertilizer_without_crop_caution():
    """Verify that asking for fertilizer without specifying a crop warns user and requests crop/stage."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat/message", json={
            "message": "What fertilizer is best for my crops?",
            "language": "en-US"
        })
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        reply = data["reply"]
        # Must prompt for the crop or growth stage and not say "I recommend using NPK 19:19:19" blindly
        assert "crop" in reply.lower()
        assert "stage" in reply.lower() or "growth" in reply.lower()
        assert "I recommend using NPK 19:19:19 fertilizer. Make sure to water the soil before application." not in reply

@pytest.mark.asyncio
async def test_chat_message_multiturn_crop_context():
    """Verify that multi-turn history provides crop context across subsequent messages."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/chat/message", json={
            "message": "What fertilizer should I apply?",
            "language": "en-US",
            "history": [
                {"role": "user", "content": "I cultivate wheat on 5 acres in Haryana."},
                {"role": "model", "content": "Wheat is an excellent Rabi cereal. How can I assist with your wheat crop?"}
            ]
        })
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        reply = data["reply"]
        # Should detect that the user is growing wheat from history and provide wheat advisory
        assert "Wheat" in reply or "wheat" in reply.lower()
        assert "DAP" in reply or "Urea" in reply or "nitrogen" in reply.lower()
