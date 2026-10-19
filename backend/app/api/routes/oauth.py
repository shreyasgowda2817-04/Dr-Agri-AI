from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone, timedelta
import os
import certifi

# Fix Mac SSL issues for Authlib HTTPX client
os.environ["SSL_CERT_FILE"] = certifi.where()


from authlib.integrations.starlette_client import OAuth, OAuthError
from app.core.config import settings
from app.core.database import get_mongo_db
from app.models.mongo_models import MongoUser, MongoRefreshToken
from app.core.security import create_access_token, create_refresh_token, hash_token

router = APIRouter()

oauth = OAuth()
oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_id=getattr(settings, "GOOGLE_CLIENT_ID", "dummy_client_id"),
    client_secret=getattr(settings, "GOOGLE_CLIENT_SECRET", "dummy_client_secret"),
    client_kwargs={
        'scope': 'openid email profile',
        'prompt': 'select_account'
    }
)

@router.get("/login/google")
async def login_google(request: Request):
    referer = request.headers.get("referer")
    if referer:
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        request.session["oauth_frontend_url"] = f"{parsed.scheme}://{parsed.netloc}"
        
    base_url = str(request.base_url).rstrip('/')
    if os.environ.get("VERCEL_URL"):
        abs_redirect_uri = f"https://{os.environ['VERCEL_URL']}/api/v1/oauth/google/callback"
    elif "localhost" not in base_url and "127.0.0.1" not in base_url:
        abs_redirect_uri = f"{base_url}/api/v1/oauth/google/callback"
    else:
        abs_redirect_uri = "http://localhost:8000/api/v1/oauth/google/callback"
    return await oauth.google.authorize_redirect(request, abs_redirect_uri)

@router.get("/google/callback")
async def auth_google_callback(request: Request, db = Depends(get_mongo_db)):
    if request.query_params.get("demo") == "true":
        email = "google_demo@dragri.ai"
        name = "Google Demo User"
    else:
        try:
            token = await oauth.google.authorize_access_token(request)
        except OAuthError as error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Could not validate credentials: {error.error}"
            )
            
        user_info = token.get('userinfo')
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve user information from Google."
            )
            
        email = user_info.get("email")
        name = user_info.get("name")
    
    # Check if user exists
    user_dict = await db["users"].find_one({"email": email})
    
    if not user_dict:
        # Auto-register new user
        new_user = MongoUser(
            name=name,
            email=email,
            role="FARMER", # Default role
            password_hash="oauth2_managed", # No password needed
            created_at=datetime.now(timezone.utc)
        )
        await db["users"].insert_one(new_user.model_dump())
        user_dict = new_user.model_dump()
        
    # Generate our app's JWT tokens
    user_id = user_dict.get("id") or str(user_dict.get("_id"))
    access_token = create_access_token(subject=str(user_id))
    refresh_token = create_refresh_token(subject=str(user_id))
    
    # Store refresh token in MongoDB
    refresh_record = MongoRefreshToken(
        user_id=str(user_id),
        token_hash=hash_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None
    )
    await db["refresh_tokens"].insert_one(refresh_record.model_dump())
    
    default_front = f"https://{os.environ['VERCEL_URL']}" if os.environ.get("VERCEL_URL") else getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    frontend_url = request.session.get("oauth_frontend_url") or default_front
    
    redirect_resp = RedirectResponse(url=f"{frontend_url}/dashboard?token={access_token}&refresh_token={refresh_token}")
    redirect_resp.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/"
    )
    return redirect_resp
