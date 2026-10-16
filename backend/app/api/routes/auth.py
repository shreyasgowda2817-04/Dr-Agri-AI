from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
from typing import Any, List, Optional
from datetime import datetime, timezone, timedelta
import os
from pydantic import BaseModel, EmailStr
import jwt

from app.core.database import get_mongo_db
from app.core.security import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    create_refresh_token, 
    hash_token, 
    ALGORITHM
)
from app.models.user import UserCreate, UserResponse
from app.models.mongo_models import MongoUser, MongoRefreshToken
from app.api.dependencies import get_current_user
import cloudinary
import cloudinary.uploader
from app.core.config import settings
from app.services.email import send_reset_password_email

if settings.CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )

router = APIRouter()

def set_refresh_cookie(response: Response, refresh_token: str):
    """Set secure HttpOnly cookie for refresh token."""
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/"
    )

def clear_refresh_cookie(response: Response):
    """Clear refresh token cookie on logout or invalid session."""
    response.delete_cookie(
        key="refresh_token",
        path="/",
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN
    )

@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, response: Response, user_in: UserCreate, db = Depends(get_mongo_db)) -> Any:
    """
    Register a new user in MongoDB, create persistent session, and return tokens.
    """
    # Check if user with email exists
    existing_user = await db["users"].find_one({"email": user_in.email.strip()})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    # Create new user
    new_user = MongoUser(
        name=user_in.name.strip(),
        email=user_in.email.strip().lower(),
        role=user_in.role,
        password_hash=get_password_hash(user_in.password),
        created_at=datetime.now(timezone.utc)
    )
    
    await db["users"].insert_one(new_user.model_dump())
    user_id = str(new_user.id)
    
    # Generate persistent session tokens
    access_token = create_access_token(subject=user_id)
    refresh_token = create_refresh_token(subject=user_id)
    
    # Store refresh token hash in DB
    refresh_record = MongoRefreshToken(
        user_id=user_id,
        token_hash=hash_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None
    )
    await db["refresh_tokens"].insert_one(refresh_record.model_dump())
    
    set_refresh_cookie(response, refresh_token)
    user_response = UserResponse.model_validate(new_user.model_dump())
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_response,
        **user_response.model_dump()
    }

class RefreshTokenPayload(BaseModel):
    refresh_token: Optional[str] = None

@router.post("/login")
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    db = Depends(get_mongo_db)
) -> Any:
    """
    OAuth2 form-data or JSON compatible token login with secure refresh cookie.
    """
    email = ""
    password = ""
    
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            email = (body.get("email") or body.get("username") or "").strip()
            password = body.get("password") or ""
        except Exception:
            pass
    
    if not email:
        try:
            form = await request.form()
            email = (form.get("username") or form.get("email") or "").strip()
            password = form.get("password") or ""
        except Exception:
            pass
            
    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required."
        )
        
    user_dict = await db["users"].find_one({"email": email})
    if not user_dict:
        # Case insensitive email search fallback
        user_dict = await db["users"].find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
        
    if not user_dict or not verify_password(password, user_dict.get("password_hash") or user_dict.get("hashed_password")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_id = user_dict.get("id") or str(user_dict.get("_id"))
    
    # Generate persistent session tokens
    access_token = create_access_token(subject=str(user_id))
    refresh_token = create_refresh_token(subject=str(user_id))
    
    # Store refresh token hash in DB
    refresh_record = MongoRefreshToken(
        user_id=str(user_id),
        token_hash=hash_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None
    )
    await db["refresh_tokens"].insert_one(refresh_record.model_dump())
    
    set_refresh_cookie(response, refresh_token)
    
    if "id" not in user_dict:
        user_dict["id"] = str(user_dict["_id"])
    user_response = UserResponse.model_validate(user_dict)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.post("/refresh")
async def refresh_session(
    request: Request,
    response: Response,
    payload: Optional[RefreshTokenPayload] = None,
    db = Depends(get_mongo_db)
) -> Any:
    """
    Restore or refresh authentication session.
    Checks HttpOnly cookie first, then request body, then X-Refresh-Token header.
    Rotates refresh token and returns fresh access token + user profile.
    """
    token = request.cookies.get("refresh_token")
    if not token and payload and payload.refresh_token:
        token = payload.refresh_token
    if not token:
        token = request.headers.get("X-Refresh-Token")
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh session found. Please log in."
        )
        
    try:
        jwt_payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = jwt_payload.get("sub")
        token_type: str = jwt_payload.get("type")
        if not user_id or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type."
            )
    except jwt.ExpiredSignatureError:
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again."
        )
    except (jwt.PyJWTError, Exception):
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh session."
        )
        
    t_hash = hash_token(token)
    session_record = await db["refresh_tokens"].find_one({"token_hash": t_hash, "revoked": False})
    if not session_record:
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or is invalid."
        )
        
    user_dict = await db["users"].find_one({"id": user_id})
    if not user_dict:
        try:
            from bson import ObjectId
            user_dict = await db["users"].find_one({"_id": ObjectId(user_id)})
        except:
            pass
            
    if not user_dict:
        clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="User account not found.")
        
    # Rotate refresh token
    await db["refresh_tokens"].update_one(
        {"_id": session_record["_id"]},
        {"$set": {"revoked": True, "rotated_at": datetime.now(timezone.utc)}}
    )
    
    new_access_token = create_access_token(subject=str(user_id))
    new_refresh_token = create_refresh_token(subject=str(user_id))
    
    new_record = MongoRefreshToken(
        user_id=str(user_id),
        token_hash=hash_token(new_refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None
    )
    await db["refresh_tokens"].insert_one(new_record.model_dump())
    
    set_refresh_cookie(response, new_refresh_token)
    
    if "id" not in user_dict:
        user_dict["id"] = str(user_dict["_id"])
    user_response = UserResponse.model_validate(user_dict)
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    payload: Optional[RefreshTokenPayload] = None,
    db = Depends(get_mongo_db)
):
    """
    Log out user, revoke refresh session in database, and clear cookies.
    """
    token = request.cookies.get("refresh_token")
    if not token and payload and payload.refresh_token:
        token = payload.refresh_token
    if not token:
        token = request.headers.get("X-Refresh-Token")
        
    if token:
        t_hash = hash_token(token)
        await db["refresh_tokens"].update_many(
            {"token_hash": t_hash},
            {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc)}}
        )
        
    clear_refresh_cookie(response)
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: UserResponse = Depends(get_current_user)) -> Any:
    """
    Get current user profile.
    """
    return current_user


class OnboardingRequest(BaseModel):
    location: str
    crops: List[str]
    farm_size: str

@router.post("/onboarding", response_model=UserResponse)
async def complete_onboarding(
    data: OnboardingRequest, 
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
) -> Any:
    """
    Complete user onboarding and update profile.
    """
    from bson import ObjectId
    user_dict = await db["users"].find_one({"id": current_user.id})
    if not user_dict:
        try:
            user_dict = await db["users"].find_one({"_id": ObjectId(current_user.id)})
        except:
            pass
            
    if not user_dict:
        raise HTTPException(status_code=404, detail="User not found")
        
    await db["users"].update_one(
        {"_id": user_dict["_id"]},
        {"$set": {"location": data.location, "is_onboarded": True}}
    )
    
    updated_user = await db["users"].find_one({"_id": user_dict["_id"]})
    updated_user["_id"] = str(updated_user["_id"])
    if "id" not in updated_user:
        updated_user["id"] = updated_user["_id"]
    return UserResponse.model_validate(updated_user)


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    district: Optional[str] = None
    village: Optional[str] = None
    preferred_language: Optional[str] = None
    avatar_url: Optional[str] = None
    farm_details: Optional[dict] = None
    notifications: Optional[dict] = None
    appearance: Optional[str] = None

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    data: ProfileUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
) -> Any:
    """
    Update the current user's profile fields.
    """
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return current_user

    from bson import ObjectId
    user_dict = await db["users"].find_one({"id": current_user.id})
    if not user_dict:
        try:
            user_dict = await db["users"].find_one({"_id": ObjectId(current_user.id)})
        except:
            pass
            
    if not user_dict:
        raise HTTPException(status_code=404, detail="User not found")
        
    await db["users"].update_one(
        {"_id": user_dict["_id"]},
        {"$set": update_data}
    )

    updated_user = await db["users"].find_one({"_id": user_dict["_id"]})
    updated_user["_id"] = str(updated_user["_id"])
    if "id" not in updated_user:
        updated_user["id"] = updated_user["_id"]
    return UserResponse.model_validate(updated_user)


@router.post("/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Upload a new profile picture to Cloudinary and update the user's avatar_url.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    file_bytes = await file.read()
    
    image_url = ""
    if settings.CLOUDINARY_CLOUD_NAME:
        try:
            upload_result = cloudinary.uploader.upload(file_bytes, folder="avatars")
            image_url = upload_result.get("secure_url")
        except Exception as e:
            print(f"Cloudinary upload failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to upload image to cloud storage.")
    else:
        # Fallback to MongoDB Base64
        import base64
        encoded = base64.b64encode(file_bytes).decode('utf-8')
        image_url = f"data:{file.content_type};base64,{encoded}"

    await db["users"].update_one(
        {"id": current_user.id},
        {"$set": {"avatar_url": image_url}}
    )
    
    updated_user = await db["users"].find_one({"id": current_user.id})
    return UserResponse.model_validate(updated_user)

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.put("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Securely change user password.
    """
    user_dict = await db["users"].find_one({"id": current_user.id})

    if not verify_password(data.old_password, user_dict["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect old password.")

    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")

    new_hash = get_password_hash(data.new_password)
    await db["users"].update_one(
        {"id": current_user.id},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"message": "Password changed successfully"}

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db = Depends(get_mongo_db)
):
    """
    Send password reset email.
    """
    user_dict = await db["users"].find_one({"email": data.email})
    if not user_dict:
        # Return success even if not found to prevent email enumeration
        return {"message": "If an account with that email exists, a reset link has been sent."}

    # Create 15-min reset token
    expires = timedelta(minutes=15)
    reset_token = create_access_token(subject=str(user_dict["id"]), expires_delta=expires)
    
    # Build frontend link
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    
    # Send email
    success = send_reset_password_email(user_dict["email"], reset_link)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send reset email. Check server configuration.")
        
    return {"message": "If an account with that email exists, a reset link has been sent."}

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db = Depends(get_mongo_db)
):
    """
    Reset password using email token.
    """
    try:
        payload = jwt.decode(data.token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=400, detail="Invalid token payload.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset link has expired.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Invalid reset link.")

    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")

    user_dict = await db["users"].find_one({"id": user_id})
    if not user_dict:
        raise HTTPException(status_code=404, detail="User not found.")

    new_hash = get_password_hash(data.new_password)
    await db["users"].update_one(
        {"id": user_id},
        {"$set": {"password_hash": new_hash}}
    )

    return {"message": "Password reset successfully. You can now log in."}

@router.delete("/account")
async def delete_account(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Permanently delete the user account.
    """
    result = await db["users"].delete_one({"id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"message": "Account successfully deleted"}
