import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal, engine, Base
from app.models import sql_models # Required for foreign key resolution
from app.models.sql_commerce import SQLProduct

MOCK_SUPPLIES = [
    {
        "name": "Organic Nitrogen Fertilizer",
        "category": "Fertilizer",
        "price": 45.99,
        "description": "High-quality organic nitrogen fertilizer for rapid growth.",
        "image_url": "https://images.unsplash.com/photo-1592982537447-6f296d19488a?w=400&q=80"
    },
    {
        "name": "Bio-Pesticide Neem Extract",
        "category": "Pesticide",
        "price": 24.50,
        "description": "Natural neem-based pesticide safe for organic farming.",
        "image_url": "https://images.unsplash.com/photo-1628588523902-6014e2cbbab4?w=400&q=80"
    },
    {
        "name": "Premium Wheat Seeds",
        "category": "Seeds",
        "price": 15.00,
        "description": "Drought-resistant high-yield wheat seeds.",
        "image_url": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80"
    },
    {
        "name": "Copper Fungicide",
        "category": "Treatment",
        "price": 32.99,
        "description": "Effective against early blight and other fungal diseases.",
        "image_url": "https://images.unsplash.com/photo-1611078709778-d56711584db9?w=400&q=80"
    },
    {
        "name": "Soil Moisture Sensor",
        "category": "Equipment",
        "price": 89.99,
        "description": "IoT sensor for real-time soil moisture tracking.",
        "image_url": "https://images.unsplash.com/photo-1584346808722-6b94beff0d42?w=400&q=80"
    }
]

async def seed_products():
    print("Starting product seeding...")
    async with engine.begin() as conn:
        # This will create all tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as db:
        # Check if products already exist
        result = await db.execute(select(SQLProduct))
        existing_products = result.scalars().all()
        
        if len(existing_products) > 0:
            print(f"Products already seeded ({len(existing_products)} items). Skipping.")
            return

        print(f"Seeding {len(MOCK_SUPPLIES)} products...")
        for item in MOCK_SUPPLIES:
            new_prod = SQLProduct(
                name=item["name"],
                category=item["category"],
                price=item["price"],
                description=item["description"],
                image_url=item["image_url"]
            )
            db.add(new_prod)
            
        await db.commit()
        print("Product seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_products())
