from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class OrgMember(BaseModel):
    user_id: str
    role: str # 'owner', 'manager', 'worker'

class Organization(BaseModel):
    id: Optional[str] = None
    name: str
    owner_id: str
    members: List[OrgMember] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "from_attributes": True
    }
