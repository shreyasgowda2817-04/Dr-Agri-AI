import asyncio
import json
import sys
import os

from app.core.database import AsyncSessionLocal
from app.models.sql_commerce import SQLProduct
from sqlalchemy.future import select

async def seed_targets():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(SQLProduct))
        products = result.scalars().all()
        for p in products:
            if p.category == "Fungicide":
                p.target_diseases = json.dumps(["Early blight", "Late blight", "Leaf Mold", "Septoria leaf spot", "Tomato___Early_blight", "Tomato___Late_blight"])
            elif p.category == "Insecticide":
                p.target_diseases = json.dumps(["Spider mites Two-spotted spider mite", "Tomato___Spider_mites Two-spotted_spider_mite"])
            else:
                p.target_diseases = json.dumps(["Bacterial spot", "Tomato___Bacterial_spot", "Healthy", "Tomato___healthy"])
        await db.commit()
    print("Successfully seeded product target diseases!")

if __name__ == "__main__":
    asyncio.run(seed_targets())
