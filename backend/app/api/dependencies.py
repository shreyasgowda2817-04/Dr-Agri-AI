from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
import jwt
from pydantic import ValidationError
from typing import Optional, List

from app.core.config import settings
from app.core.database import get_mongo_db
from app.models.user import UserResponse
from app.models.mongo_models import UserRole
from app.core.security import ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db = Depends(get_mongo_db)
) -> UserResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type", "access")
        if user_id is None or token_type != "access":
            raise credentials_exception
    except (jwt.PyJWTError, ValidationError):
        raise credentials_exception
        
    user_dict = await db["users"].find_one({"id": user_id})
    if user_dict is None:
        try:
            from bson import ObjectId
            user_dict = await db["users"].find_one({"_id": ObjectId(user_id)})
        except:
            pass
            
    if user_dict is None:
        raise credentials_exception
        
    # Ensure id field is set for the response model
    if not user_dict.get("id"):
        user_dict["id"] = str(user_dict.get("_id", user_id))
        
    return UserResponse.model_validate(user_dict)

async def get_optional_current_user(
    request: Request,
    db = Depends(get_mongo_db)
) -> Optional[UserResponse]:
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    token = auth.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type", "access")
        if not user_id or token_type != "access":
            return None
        user_dict = await db["users"].find_one({"id": user_id})
        if not user_dict:
            try:
                from bson import ObjectId
                user_dict = await db["users"].find_one({"_id": ObjectId(user_id)})
            except:
                pass
        if user_dict:
            if "id" not in user_dict:
                user_dict["id"] = str(user_dict["_id"])
            return UserResponse.model_validate(user_dict)
    except:
        return None
    return None

def RequireRole(allowed_roles: List[UserRole]):
    async def role_checker(current_user: UserResponse = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Requires one of: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker

async def get_current_admin(current_user: UserResponse = Depends(RequireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]))) -> UserResponse:
    return current_user
