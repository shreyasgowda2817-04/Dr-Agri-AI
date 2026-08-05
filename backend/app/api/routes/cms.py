from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from app.core.database import get_mongo_db
from app.api.dependencies import get_current_user, get_current_admin
from app.models.user import UserResponse
from app.models.mongo_models import MongoArticle

router = APIRouter()

class ArticleCreate(BaseModel):
    title: str
    content: str
    article_type: str = "News"
    is_published: bool = False
    image_url: Optional[str] = None
    tags: List[str] = []

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    article_type: Optional[str] = None
    is_published: Optional[bool] = None
    image_url: Optional[str] = None
    tags: Optional[List[str]] = None

@router.get("/articles", response_model=List[dict])
async def get_published_articles(
    db = Depends(get_mongo_db)
):
    """Get all published articles for farmers/public."""
    articles = await db["articles"].find({"is_published": True}).sort("created_at", -1).to_list(100)
    for a in articles:
        a["_id"] = str(a["_id"])
    return articles

@router.get("/articles/all", response_model=List[dict])
async def get_all_articles(
    current_admin: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """Get all articles including drafts (Admin only)."""
    articles = await db["articles"].find().sort("created_at", -1).to_list(100)
    for a in articles:
        a["_id"] = str(a["_id"])
    return articles

@router.post("/articles", response_model=dict)
async def create_article(
    article: ArticleCreate,
    current_admin: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """Admin creates a new article."""
    new_article = MongoArticle(
        **article.model_dump(),
        author_id=str(current_admin.id)
    )
    art_dict = new_article.model_dump()
    await db["articles"].insert_one(art_dict)
    art_dict["_id"] = str(art_dict.pop("_id", None))
    return art_dict

@router.put("/articles/{article_id}", response_model=dict)
async def update_article(
    article_id: str,
    article_update: ArticleUpdate,
    current_admin: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """Admin updates an article."""
    existing = await db["articles"].find_one({"id": article_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")

    update_data = article_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    if update_data:
        await db["articles"].update_one(
            {"id": article_id},
            {"$set": update_data}
        )

    updated = await db["articles"].find_one({"id": article_id})
    updated["_id"] = str(updated["_id"])
    return updated

@router.delete("/articles/{article_id}")
async def delete_article(
    article_id: str,
    current_admin: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """Admin deletes an article."""
    result = await db["articles"].delete_one({"id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Article deleted successfully"}
