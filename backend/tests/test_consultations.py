import pytest
from datetime import datetime, timezone
from bson import ObjectId
from app.models.user import UserResponse
from app.models.mongo_models import UserRole
from app.api.routes.consultations import (
    CallRequest,
    PrescriptionRequest,
    ReviewRequest,
    initiate_call,
    get_active_calls,
    accept_call,
    decline_call,
    issue_prescription,
    get_prescriptions,
    submit_review,
)

# Mock Mongo Collection
class MockCollection:
    def __init__(self):
        self.docs = []

    async def insert_one(self, doc):
        doc = dict(doc)
        if "_id" not in doc:
            doc["_id"] = ObjectId()
        self.docs.append(doc)
        class Res:
            inserted_id = doc["_id"]
        return Res()

    async def find_one(self, query):
        for d in self.docs:
            match = True
            for k, v in query.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                return dict(d)
        return None

    async def find_one_and_update(self, filter_q, update_q):
        for d in self.docs:
            match = True
            for k, v in filter_q.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                for k, v in update_q.get("$set", {}).items():
                    d[k] = v
                return dict(d)
        return None

    async def update_one(self, filter_q, update_q):
        for d in self.docs:
            match = True
            for k, v in filter_q.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                for k, v in update_q.get("$set", {}).items():
                    d[k] = v
                return True
        return False

    def find(self, query):
        matched = []
        for d in self.docs:
            if "$or" in query:
                or_matches = any(
                    all(d.get(k) == v for k, v in branch.items())
                    for branch in query["$or"]
                )
                if or_matches and query.get("status") == d.get("status"):
                    matched.append(dict(d))
            else:
                match = all(d.get(k) == v for k, v in query.items())
                if match:
                    matched.append(dict(d))

        class Cursor:
            def __init__(self, items):
                self.items = items
            def sort(self, *args, **kwargs):
                return self
            async def to_list(self, length=100):
                return self.items[:length]

        return Cursor(matched)

class MockDB(dict):
    def __getitem__(self, item):
        if item not in self:
            self[item] = MockCollection()
        return super().__getitem__(item)

@pytest.mark.asyncio
async def test_consultation_lifecycle():
    db = MockDB()

    farmer = UserResponse(
        id=str(ObjectId()),
        email="farmer@dragri.ai",
        name="Farmer Ramesh",
        role=UserRole.FARMER,
        created_at=datetime.now(timezone.utc)
    )

    expert_id = str(ObjectId())
    expert = UserResponse(
        id=expert_id,
        email="expert@dragri.ai",
        name="Dr. Swaminathan (Agronomist)",
        role=UserRole.AGRONOMY_EXPERT,
        created_at=datetime.now(timezone.utc)
    )

    # 1. Farmer initiates call to expert
    call_req = CallRequest(expert_id=expert_id, call_type="video")
    call_res = await initiate_call(call_req, current_user=farmer, db=db)

    assert "room_name" in call_res
    assert call_res["room_name"].startswith("dragriai")
    assert "call_id" in call_res
    call_id = call_res["call_id"]

    # 2. Expert polls active incoming calls and sees the ringing call
    active_calls = await get_active_calls(current_user=expert, db=db)
    assert len(active_calls) == 1
    assert active_calls[0]["id"] == call_id
    assert active_calls[0]["farmer_id"] == str(farmer.id)
    assert active_calls[0]["room_name"] == call_res["room_name"]

    # 3. Expert accepts the call
    accept_res = await accept_call(call_id, current_user=expert, db=db)
    assert accept_res["message"] == "Call accepted"

    # Verify call status changed to accepted
    updated_call = await db["active_calls"].find_one({"_id": ObjectId(call_id)})
    assert updated_call["status"] == "accepted"
    assert updated_call["accepted_by"] == str(expert.id)

    # 4. Expert issues a prescription for the farmer
    rx_req = PrescriptionRequest(
        farmer_id=str(farmer.id),
        diagnosis="Early Blight detected on Tomato crops",
        prescribed_products=["prod_fungicide_copper", "prod_organic_neem"],
        notes="Spray copper oxychloride 50 WP early morning every 7 days."
    )
    rx_res = await issue_prescription(rx_req, current_user=expert, db=db)
    assert rx_res["message"] == "Prescription issued successfully"
    assert "id" in rx_res

    # 5. Farmer views their prescriptions
    farmer_rxs = await get_prescriptions(current_user=farmer, db=db)
    assert len(farmer_rxs) == 1
    assert farmer_rxs[0]["diagnosis"] == "Early Blight detected on Tomato crops"
    assert "prod_fungicide_copper" in farmer_rxs[0]["prescribed_products"]

    # 6. Farmer submits genuine review after call
    rev_req = ReviewRequest(rating=5, comment="Excellent consultation, very helpful advice!")
    rev_res = await submit_review(call_id, rev_req, current_user=farmer, db=db)
    assert rev_res["message"] == "Review submitted successfully"
