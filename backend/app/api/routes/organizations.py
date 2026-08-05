from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_mongo_db
from app.api.dependencies import get_current_user
from app.models.user import UserResponse
from app.models.mongo_models import MongoOrganization, MongoOrgMember

router = APIRouter()

class OrgCreateRequest(BaseModel):
    name: str
    org_type: str = "Farm"

class OrgMemberAddRequest(BaseModel):
    email: str
    role: str = "worker" # owner, manager, worker

class OrgMemberResponse(BaseModel):
    id: str
    name: str
    email: str
    org_role: str

class OrganizationResponse(BaseModel):
    id: str
    name: str
    org_type: str
    member_count: int
    my_role: str

@router.get("/my-orgs", response_model=List[OrganizationResponse])
async def get_my_organizations(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """List all organizations the current user belongs to."""
    pipeline = [
        {"$match": {"user_id": str(current_user.id)}},
        {"$lookup": {
            "from": "organizations",
            "localField": "org_id",
            "foreignField": "id",
            "as": "org"
        }},
        {"$unwind": "$org"}
    ]
    
    orgs_with_roles = await db["org_members"].aggregate(pipeline).to_list(length=100)
    
    response = []
    for r in orgs_with_roles:
        org = r.get("org", {})
        my_role = r.get("role", "")
        
        # Count total members
        count = await db["org_members"].count_documents({"org_id": org.get("id")})
        
        response.append({
            "id": org.get("id"),
            "name": org.get("name"),
            "org_type": org.get("org_type"),
            "member_count": count,
            "my_role": my_role
        })
    return response

@router.get("", response_model=List[OrganizationResponse])
async def get_all_organizations(
    db = Depends(get_mongo_db)
):
    """Admin route to list all organizations."""
    orgs = await db["organizations"].find().to_list(length=1000)
    response = []
    for org in orgs:
        count = await db["org_members"].count_documents({"org_id": org.get("id")})
        response.append({
            "id": org.get("id"),
            "name": org.get("name"),
            "org_type": org.get("org_type"),
            "member_count": count,
            "my_role": "admin"
        })
    return response

@router.post("")
async def create_organization(
    req: OrgCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Create a new organization and make current user the owner."""
    new_org = MongoOrganization(
        name=req.name,
        org_type=req.org_type
    )
    org_dict = new_org.model_dump()
    await db["organizations"].insert_one(org_dict)
    
    # Make creator the owner
    new_member = MongoOrgMember(
        org_id=org_dict["id"],
        user_id=str(current_user.id),
        role="owner"
    )
    await db["org_members"].insert_one(new_member.model_dump())
    return {"id": org_dict["id"], "message": "Workspace created successfully"}

class OrgUpdateRequest(BaseModel):
    name: Optional[str] = None
    org_type: Optional[str] = None

@router.put("/{org_id}")
async def update_organization(
    org_id: str,
    req: OrgUpdateRequest,
    db = Depends(get_mongo_db)
):
    """Update an organization's details."""
    existing = await db["organizations"].find_one({"id": org_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    update_data = req.model_dump(exclude_unset=True)
    if update_data:
        await db["organizations"].update_one(
            {"id": org_id},
            {"$set": update_data}
        )
    return {"message": "Organization updated successfully"}

@router.delete("/{org_id}")
async def delete_organization(
    org_id: str,
    db = Depends(get_mongo_db)
):
    """Delete an organization and all its members."""
    result = await db["organizations"].delete_one({"id": org_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    await db["org_members"].delete_many({"org_id": org_id})
    return {"message": "Organization deleted successfully"}

@router.get("/{org_id}/members", response_model=List[OrgMemberResponse])
async def get_org_members(
    org_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """List all members of an organization."""
    # Security: Ensure current user is in this org
    check = await db["org_members"].find_one({"org_id": org_id, "user_id": str(current_user.id)})
    if not check:
        raise HTTPException(status_code=403, detail="Access denied")

    pipeline = [
        {"$match": {"org_id": org_id}},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "id",
            "as": "user"
        }},
        {"$unwind": "$user"}
    ]
    
    members = await db["org_members"].aggregate(pipeline).to_list(length=100)
    
    return [
        {"id": m.get("user", {}).get("id"), "name": m.get("user", {}).get("name"), "email": m.get("user", {}).get("email"), "org_role": m.get("role")}
        for m in members
    ]

@router.post("/{org_id}/members")
async def add_member_to_org(
    org_id: str,
    req: OrgMemberAddRequest,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Invite a user to the organization by email."""
    # 1. Ensure current user is OWNER or MANAGER
    my_membership = await db["org_members"].find_one({"org_id": org_id, "user_id": str(current_user.id)})
    if not my_membership or my_membership.get("role") not in ["owner", "manager"]:
        raise HTTPException(status_code=403, detail="Only owners/managers can invite members")

    # 2. Find target user by email
    target_user = await db["users"].find_one({"email": req.email})
    if not target_user:
        raise HTTPException(status_code=404, detail="User with this email not found on the platform")

    # 3. Add to org
    existing = await db["org_members"].find_one({"org_id": org_id, "user_id": target_user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="User is already in this workspace")

    new_member = MongoOrgMember(
        org_id=org_id,
        user_id=target_user["id"],
        role=req.role
    )
    await db["org_members"].insert_one(new_member.model_dump())
    
    return {"message": "Member invited successfully"}

@router.delete("/{org_id}/members/{user_id}")
async def remove_member_from_org(
    org_id: str,
    user_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Remove a user from an organization."""
    # Ensure current user is OWNER
    my_membership = await db["org_members"].find_one({"org_id": org_id, "user_id": str(current_user.id)})
    if not my_membership or my_membership.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only owners can remove members")

    result = await db["org_members"].delete_one({"org_id": org_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found in organization")
        
    return {"message": "Member removed successfully"}
