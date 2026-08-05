import requests
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import certifi

async def get_token():
    # Use the connection string from .env
    from app.core.config import settings
    from app.core.security import create_access_token
    client = AsyncIOMotorClient(settings.MONGODB_URL, tlsCAFile=certifi.where())
    db = client[settings.DATABASE_NAME]
    user = await db["users"].find_one({"role": "SUPER_ADMIN"})
    if not user:
        user = await db["users"].find_one()
    return create_access_token(data={"sub": user["id"]})

token = asyncio.run(get_token())

payload = {
    "title": "Test POST Cloud",
    "content": "Test content",
    "article_type": "News",
    "is_published": True,
    "image_url": "",
    "tags": ["Test"]
}

res = requests.post(
    "http://127.0.0.1:8001/api/v1/cms/articles",
    json=payload,
    headers={"Authorization": f"Bearer {token}"}
)

print(res.status_code)
print(res.text)
