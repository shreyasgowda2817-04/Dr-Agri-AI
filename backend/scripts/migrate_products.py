import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal, engine, Base
import app.models.sql_commerce
from seed_products import seed_products

async def migrate():
    print("Dropping existing products table...")
    async with engine.begin() as conn:
        # SQLite drop table
        await conn.execute(text("DROP TABLE IF EXISTS inventory")) # due to FK
        await conn.execute(text("DROP TABLE IF EXISTS products"))
    print("Dropped. Running seed...")
    await seed_products()

if __name__ == "__main__":
    asyncio.run(migrate())
