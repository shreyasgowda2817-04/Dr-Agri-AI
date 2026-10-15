from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.api.dependencies import get_current_admin
from app.models.user import UserResponse
from app.core.database import get_mongo_db
from app.models.mongo_models import MongoProduct
from pydantic import BaseModel

router = APIRouter()

@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    current_admin: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """
    Fetch all users. Only accessible by Admins.
    """
    users = await db["users"].find().to_list(length=1000)
    for u in users:
        u["_id"] = str(u["_id"])
        if "id" not in u:
            u["id"] = u["_id"]
    return users

class RoleUpdate(BaseModel):
    role: str

class UserAdminUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    languages: Optional[str] = None
    is_active: Optional[bool] = None

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_update: RoleUpdate,
    current_admin: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """Admin updates a user's role."""
    user = await db["users"].find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db["users"].update_one(
        {"id": user_id},
        {"$set": {"role": role_update.role}}
    )

    return {"message": "User role updated successfully", "new_role": role_update.role}

@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    update_data: UserAdminUpdate,
    current_admin: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """Admin updates a user's details."""
    update_dict = update_data.model_dump(exclude_unset=True)
    if not update_dict:
        return {"message": "Nothing to update"}
        
    from bson import ObjectId
    
    # Try by id field
    result = await db["users"].update_one({"id": user_id}, {"$set": update_dict})
    if result.matched_count == 0:
        # Try by _id field
        try:
            result = await db["users"].update_one({"_id": ObjectId(user_id)}, {"$set": update_dict})
        except:
            pass
            
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User updated"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_admin: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """Admin deletes a user entirely."""
    from bson import ObjectId
    
    # Try by id field
    result = await db["users"].delete_one({"id": user_id})
    if result.deleted_count == 0:
        # Try by _id field
        try:
            result = await db["users"].delete_one({"_id": ObjectId(user_id)})
        except:
            pass
            
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# --- PRODUCT SCHEMAS ---
class ProductCreate(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    price: float
    dosage_per_acre: Optional[str] = None
    is_organic: bool = False
    image_url: Optional[str] = None
    stock_quantity: int = 100
    discount_percentage: float = 0.0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    dosage_per_acre: Optional[str] = None
    is_organic: Optional[bool] = None
    image_url: Optional[str] = None
    stock_quantity: Optional[int] = None
    discount_percentage: Optional[float] = None

class BulkActionRequest(BaseModel):
    product_ids: List[str]
    action: str # "delete" or "discount"
    discount_percentage: Optional[float] = None

# --- PRODUCT ROUTES ---
@router.post("/products")
async def create_product(
    product: ProductCreate, 
    current_admin: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """Admin creates a new product in the marketplace."""
    new_product = MongoProduct(**product.model_dump())
    prod_dict = new_product.model_dump()
    await db["products"].insert_one(prod_dict)
    prod_dict["_id"] = str(prod_dict["_id"])
    return prod_dict

@router.put("/products/{product_id}")
async def update_product(
    product_id: str,
    product_update: ProductUpdate,
    current_admin: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """Admin updates an existing product."""
    product = await db["products"].find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_update.model_dump(exclude_unset=True)
    if update_data:
        await db["products"].update_one(
            {"id": product_id},
            {"$set": update_data}
        )

    updated_product = await db["products"].find_one({"id": product_id})
    if updated_product:
        updated_product["_id"] = str(updated_product["_id"])
    return updated_product

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    current_admin: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """Admin deletes a product."""
    result = await db["products"].delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"message": "Product deleted successfully"}

@router.post("/products/bulk")
async def bulk_action_products(
    request: BulkActionRequest,
    current_admin: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """Admin performs a bulk action on multiple products."""
    if request.action == "delete":
        result = await db["products"].delete_many({"id": {"$in": request.product_ids}})
        return {"message": f"Successfully deleted {result.deleted_count} products"}
        
    elif request.action == "discount":
        if request.discount_percentage is None:
            raise HTTPException(status_code=400, detail="discount_percentage is required for discount action")
            
        result = await db["products"].update_many(
            {"id": {"$in": request.product_ids}},
            {"$set": {"discount_percentage": request.discount_percentage}}
        )
        return {"message": f"Successfully applied discount to {result.modified_count} products"}
        
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
