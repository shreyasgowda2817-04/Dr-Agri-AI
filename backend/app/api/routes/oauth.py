from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone

from authlib.integrations.starlette_client import OAuth, OAuthError
from app.core.config import settings
from app.core.database import get_mongo_db
from app.models.mongo_models import MongoUser
from app.core.security import create_access_token

router = APIRouter()

oauth = OAuth()
oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_id=getattr(settings, "GOOGLE_CLIENT_ID", "dummy_client_id"),
    client_secret=getattr(settings, "GOOGLE_CLIENT_SECRET", "dummy_client_secret"),
    client_kwargs={
        'scope': 'openid email profile'
    }
)

@router.get("/login/google")
async def login_google(request: Request):
    # Demo Mode Bypass
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    if not client_id or client_id == "dummy_client_id":
        return RedirectResponse(url=f"{settings.API_V1_STR}/oauth/google/callback?demo=true")

    # This URL must match exactly the callback URL registered in Google Cloud Console
    redirect_uri = f"{settings.API_V1_STR}/oauth/google/callback"
    
    # In a real app we need absolute URL. Since this is local dev we reconstruct it:
    abs_redirect_uri = request.url_for('auth_google_callback')
    
    return await oauth.google.authorize_redirect(request, str(abs_redirect_uri))

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
        
    # Generate our app's JWT token
    access_token = create_access_token(subject=str(user_dict["id"]))
    
    # Redirect to frontend dashboard with token (Frontend must parse it from URL)
    # Ideally, frontend URL is in settings. For now we use standard localhost:5173
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/dashboard?token={access_token}")
