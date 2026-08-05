from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import json

from app.core.database import get_mongo_db
from app.api.dependencies import get_current_user
from app.models.user import UserResponse
from app.models.mongo_models import MongoTicket, MongoTicketMessage

router = APIRouter()

class TicketCreate(BaseModel):
    subject: str
    description: str
    priority: str = "MEDIUM"

class TicketMessageCreate(BaseModel):
    message: str

class TicketStatusUpdate(BaseModel):
    status: str

@router.post("/", response_model=MongoTicket, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    data: TicketCreate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Create a new support ticket (Farmer).
    """
    new_ticket = MongoTicket(
        user_id=str(current_user.id),
        user_name=current_user.name,
        subject=data.subject,
        description=data.description,
        priority=data.priority,
        status="OPEN"
    )
    
    insert_result = await db["tickets"].insert_one(new_ticket.model_dump())
    created = await db["tickets"].find_one({"_id": insert_result.inserted_id})
    created["_id"] = str(created["_id"])
    return MongoTicket(**created)

@router.get("/", response_model=List[MongoTicket])
async def list_tickets(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    List all tickets. Admins see all, Farmers see only their own.
    """
    query = {}
    if current_user.role not in ["ADMIN", "SUPER_ADMIN", "AGRONOMY_EXPERT"]:
        query = {"user_id": str(current_user.id)}
        
    tickets = await db["tickets"].find(query).sort("created_at", -1).to_list(1000)
    
    return [MongoTicket(**t) for t in tickets]

@router.get("/{ticket_id}", response_model=MongoTicket)
async def get_ticket(
    ticket_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Get a specific ticket's details and messages.
    """
    ticket = await db["tickets"].find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if current_user.role not in ["ADMIN", "SUPER_ADMIN", "AGRONOMY_EXPERT"] and ticket["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view this ticket")
        
    return MongoTicket(**ticket)

@router.post("/{ticket_id}/messages", response_model=MongoTicketMessage)
async def add_message(
    ticket_id: str,
    data: TicketMessageCreate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Add a reply message to a ticket.
    """
    ticket = await db["tickets"].find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if current_user.role not in ["ADMIN", "SUPER_ADMIN", "AGRONOMY_EXPERT"] and ticket["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to reply to this ticket")
        
    new_message = MongoTicketMessage(
        sender_id=str(current_user.id),
        sender_name=current_user.name,
        sender_role=current_user.role,
        message=data.message
    )
    
    await db["tickets"].update_one(
        {"id": ticket_id},
        {
            "$push": {"messages": new_message.model_dump()},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    return new_message

@router.put("/{ticket_id}/status", response_model=MongoTicket)
async def update_status(
    ticket_id: str,
    data: TicketStatusUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Update ticket status (Admins only).
    """
    if current_user.role not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Only admins can change ticket status")
        
    ticket = await db["tickets"].find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    update_data = {
        "status": data.status,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if data.status == "RESOLVED":
        update_data["resolved_at"] = datetime.now(timezone.utc)
        
    await db["tickets"].update_one(
        {"id": ticket_id},
        {"$set": update_data}
    )
    
    updated = await db["tickets"].find_one({"id": ticket_id})
    return MongoTicket(**updated)
