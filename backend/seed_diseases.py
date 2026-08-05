import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.future import select
from sqlalchemy import update
from app.models.sql_commerce import SQLProduct
from app.core.config import settings

SQL_DATABASE_URL = getattr(settings, "SQL_DATABASE_URL", "sqlite+aiosqlite:///./crop_disease.db")
engine = create_async_engine(SQL_DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def seed():
    async with AsyncSessionLocal() as db:
        # Copper Fungicide
        await db.execute(
            update(SQLProduct)
            .where(SQLProduct.name == "Copper Fungicide")
            .values(target_diseases=json.dumps(["Late_blight", "Early_blight", "Septoria_leaf_spot", "Blight", "Powdery_mildew", "Leaf_scorch"]))
        )
        # Bio-Pesticide Neem Extract
        await db.execute(
            update(SQLProduct)
            .where(SQLProduct.name == "Bio-Pesticide Neem Extract")
            .values(target_diseases=json.dumps(["Spider_mites", "Two-spotted_spider_mite", "Target_Spot"]))
        )
        # Organic Nitrogen Fertilizer
        await db.execute(
            update(SQLProduct)
            .where(SQLProduct.name == "Organic Nitrogen Fertilizer")
            .values(target_diseases=json.dumps(["Leaf_Mold", "healthy"]))
        )
        
        await db.commit()
        print("Product target_diseases seeded!")

if __name__ == "__main__":
    asyncio.run(seed())
