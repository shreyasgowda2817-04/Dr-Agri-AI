import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis
from app.core.config import settings

# 1. MongoDB for All Data (Structured and Unstructured)
class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

# 2. Redis for Caching & WebSockets
class Cache:
    client: redis.Redis = None

cache_instance = Cache()

async def connect_to_databases():
    # Mongo
    print(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    import certifi
    if "mongodb+srv" in settings.MONGODB_URL:
        db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True)
    else:
        db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL, tlsAllowInvalidCertificates=True)
    db_instance.db = db_instance.client[settings.DATABASE_NAME]
    
    # Ensure indexes for unique fields
    try:
        await db_instance.db["users"].create_index("email", unique=True)
        await db_instance.db["users"].create_index("id", unique=True)
        await db_instance.db["farm_plots"].create_index("id", unique=True)
        await db_instance.db["crops"].create_index("id", unique=True)
        await db_instance.db["orders"].create_index("id", unique=True)
    except Exception as e:
        print(f"Error creating MongoDB indexes: {e}")
        
    print(f"Connected to MongoDB: {settings.DATABASE_NAME} and indexes initialized.")

    # Redis
    REDIS_URL = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
    cache_instance.client = redis.from_url(REDIS_URL, decode_responses=True)
    try:
        await cache_instance.client.ping()
        print("Connected to Redis Cache.")
    except Exception as e:
        print(f"Redis not available (skipping): {e}")

async def close_database_connections():
    print("Closing database connections...")
    if db_instance.client:
        db_instance.client.close()
    if cache_instance.client:
        await cache_instance.client.close()
    print("Database connections closed.")

def get_db():
    return db_instance.db

def get_mongo_db():
    return db_instance.db

# To satisfy legacy route dependencies temporarily during migration
def get_sql_db():
    return db_instance.db

def get_redis():
    return cache_instance.client
