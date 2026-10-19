from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

from app.core.config import settings
from app.core.database import connect_to_databases, close_database_connections
from app.api.routes import auth, predict, reports, finance, chat, agronomy, marketplace, schemes, payments, admin, farms, invoices, shipping, consultations, delivery, organizations, b2b, calendar, drones, mlops, commodity, search, inventory, cms, support, notifications, weather, subscriptions, ads

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    await connect_to_databases()
    
    yield
    # Shutdown actions
    await close_database_connections()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Attach rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Custom Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' checkout.razorpay.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; connect-src 'self' http://localhost:* ws://localhost:* api.openweathermap.org;"
    return response

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

from starlette.middleware.sessions import SessionMiddleware

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://localhost:.*|https?://127\.0\.0\.1:.*|https://.*\.vercel\.app", 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["set-cookie", "X-Refresh-Token"],
)

# Authlib requires session middleware
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# Include Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
from app.api.routes import oauth
app.include_router(oauth.router, prefix=f"{settings.API_V1_STR}/oauth", tags=["OAuth"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin"])
app.include_router(predict.router, prefix=f"{settings.API_V1_STR}/ml", tags=["Machine Learning"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["Reports"])
app.include_router(finance.router, prefix=f"{settings.API_V1_STR}/finance", tags=["Finance"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["AI Chatbot"])
app.include_router(agronomy.router, prefix=f"{settings.API_V1_STR}/agronomy", tags=["Agronomy"])
app.include_router(marketplace.router, prefix=f"{settings.API_V1_STR}/marketplace", tags=["Marketplace"])
app.include_router(schemes.router, prefix=f"{settings.API_V1_STR}/schemes", tags=["Govt Schemes"])
app.include_router(payments.router, prefix=f"{settings.API_V1_STR}/payments", tags=["Payments"])
app.include_router(subscriptions.router, prefix=f"{settings.API_V1_STR}/subscriptions", tags=["Subscriptions"])
app.include_router(ads.router, prefix=f"{settings.API_V1_STR}/ads", tags=["Sponsored Ads"])
app.include_router(farms.router, prefix=f"{settings.API_V1_STR}", tags=["Farms"])
app.include_router(invoices.router, prefix=f"{settings.API_V1_STR}/invoices", tags=["Invoices"])
app.include_router(shipping.router, prefix=f"{settings.API_V1_STR}/shipping", tags=["Shipping"])
app.include_router(consultations.router, prefix=f"{settings.API_V1_STR}/consultations", tags=["Consultations"])
app.include_router(delivery.router, prefix=f"{settings.API_V1_STR}/delivery", tags=["Delivery"])
app.include_router(organizations.router, prefix=f"{settings.API_V1_STR}/organizations", tags=["Organizations"])
app.include_router(b2b.router, prefix=f"{settings.API_V1_STR}/b2b", tags=["B2B API"])

app.include_router(calendar.router, prefix=f"{settings.API_V1_STR}/calendar", tags=["Calendar"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["Notifications"])
app.include_router(drones.router, prefix=f"{settings.API_V1_STR}/drones", tags=["Drones"])
app.include_router(mlops.router, prefix=f"{settings.API_V1_STR}/mlops", tags=["MLOps Dashboard"])
app.include_router(commodity.router, prefix=f"{settings.API_V1_STR}/commodity", tags=["Commodity Pricing"])
app.include_router(search.router, prefix=f"{settings.API_V1_STR}/search", tags=["Global Search"])
app.include_router(weather.router, prefix=f"{settings.API_V1_STR}/weather", tags=["Weather Forecast"])
app.include_router(inventory.router, prefix=f"{settings.API_V1_STR}/inventory", tags=["Warehouse Inventory"])
app.include_router(cms.router, prefix=f"{settings.API_V1_STR}/cms", tags=["CMS"])
app.include_router(support.router, prefix=f"{settings.API_V1_STR}/support", tags=["Support & Helpdesk"])
from app.api.websockets import notifications
app.include_router(notifications.router, tags=["WebSockets"])

@app.get("/")
def root():
    return {"message": "Welcome to the AI Crop Disease Detection API"}

@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {"status": "ok"}
