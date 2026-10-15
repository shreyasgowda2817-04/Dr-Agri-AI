import asyncio
from app.models.report import DiseaseReportResponse
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def test():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    cursor = db["disease_reports"].find().sort("created_at", -1)
    reports = await cursor.to_list(length=100)
    print(f"Found {len(reports)} reports")
    for report in reports:
        report["_id"] = str(report["_id"])
        try:
            DiseaseReportResponse(**report)
        except Exception as e:
            print(f"FAILED on report {report['_id']}: {e}")

asyncio.run(test())
