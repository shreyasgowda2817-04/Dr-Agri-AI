import asyncio
import motor.motor_asyncio

async def clear():
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    await client['crop_disease_db']['warehouse_items'].drop()
    print('Cleared')

asyncio.run(clear())
