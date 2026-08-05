from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.api.dependencies import get_current_user
from app.models.user import UserResponse
from app.models.finance import ExpenseItem, RevenueItem, FarmPlot
from app.models.mongo_models import MongoExpense, MongoRevenue, MongoFarmPlot, MongoCrop
from app.core.database import get_mongo_db
from datetime import datetime, timezone
import uuid

router = APIRouter()

@router.post("/expenses", response_model=ExpenseItem)
async def create_expense(expense: ExpenseItem, current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    new_expense = MongoExpense(
        user_id=str(current_user.id),
        category=expense.category,
        amount=expense.amount,
        description=expense.description,
        date=expense.date
    )
    exp_dict = new_expense.model_dump()
    await db["expenses"].insert_one(exp_dict)
    return ExpenseItem.model_validate(exp_dict)

@router.post("/revenues", response_model=RevenueItem)
async def create_revenue(revenue: RevenueItem, current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    new_revenue = MongoRevenue(
        user_id=str(current_user.id),
        source=revenue.crop_name,
        amount=revenue.amount,
        description=revenue.description,
        date=revenue.date
    )
    rev_dict = new_revenue.model_dump()
    await db["revenues"].insert_one(rev_dict)
    
    res = RevenueItem.model_validate(rev_dict)
    res.crop_name = rev_dict["source"]
    return res

@router.post("/farms", response_model=FarmPlot)
async def create_farm(farm: FarmPlot, current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    new_farm = MongoFarmPlot(
        user_id=str(current_user.id),
        name=farm.name,
        area_acres=farm.area_size,
        crop=farm.crop_type or "Unknown"
    )
    farm_dict = new_farm.model_dump()
    await db["farm_plots"].insert_one(farm_dict)
    
    res = FarmPlot(
        id=farm_dict["id"],
        user_id=farm_dict["user_id"],
        name=farm_dict["name"],
        area_size=farm_dict["area_acres"],
        crop_type=farm_dict["crop"],
        created_at=farm_dict["created_at"]
    )
    return res

@router.get("/farms", response_model=List[FarmPlot])
async def get_farms(current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    farms = await db["farm_plots"].find({"user_id": str(current_user.id)}).to_list(length=100)
    
    formatted_farms = []
    for f in farms:
        res = FarmPlot(
            id=f.get("id"),
            user_id=f.get("user_id"),
            name=f.get("name"),
            area_size=f.get("area_acres"),
            crop_type=f.get("crop"),
            created_at=f.get("created_at")
        )
        formatted_farms.append(res)
        
    return formatted_farms

@router.get("/summary", response_model=Dict[str, Any])
async def get_finance_summary(current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    user_id = str(current_user.id)
    
    # 1. Get all expenses
    expenses = await db["expenses"].find({"user_id": user_id}).to_list(length=1000)
    total_expenses = sum(exp.get("amount", 0) for exp in expenses)
    
    # Aggregate by category for charts
    expense_by_category = {}
    for exp in expenses:
        cat = exp.get("category", "Unknown")
        expense_by_category[cat] = expense_by_category.get(cat, 0) + exp.get("amount", 0)
        
    chart_data = [{"name": k, "value": v} for k, v in expense_by_category.items()]
    
    # 2. Get all revenues
    revenues = await db["revenues"].find({"user_id": user_id}).to_list(length=1000)
    total_revenue = sum(rev.get("amount", 0) for rev in revenues)
    
    # 3. Calculate Profit/Loss
    profit = total_revenue - total_expenses
    
    # Combine into a unified transactions ledger
    transactions = []
    for exp in expenses:
        transactions.append({
            "id": f"EXP-{exp.get('id')}",
            "type": "Expense",
            "category": exp.get("category"),
            "amount": exp.get("amount"),
            "date": exp.get("date").isoformat() if exp.get("date") else None,
            "description": exp.get("description")
        })
    for rev in revenues:
        transactions.append({
            "id": f"REV-{rev.get('id')}",
            "type": "Revenue",
            "category": rev.get("source"),
            "amount": rev.get("amount"),
            "date": rev.get("date").isoformat() if rev.get("date") else None,
            "description": rev.get("description")
        })
        
    # Sort by date descending
    transactions.sort(key=lambda x: x["date"] or "", reverse=True)
    
    return {
        "total_expenses": total_expenses,
        "total_revenue": total_revenue,
        "net_profit": profit,
        "expense_breakdown": chart_data,
        "transactions": transactions
    }

@router.get("/dossier")
async def generate_agricredit_dossier(
    current_user: UserResponse = Depends(get_current_user), 
    db = Depends(get_mongo_db)
):
    """
    Aggregates financial, agronomic, and disease data to generate an AgriCredit Loan Dossier.
    Calculates Farm Health Score dynamically.
    """
    user_id = str(current_user.id)
    
    # 1. Base Score calculation (similar to B2B logic)
    score = 700
    details = []
    
    # 2. Get Farms
    farms = await db["farm_plots"].find({"user_id": user_id}).to_list(length=100)
    if not farms:
        score -= 100
        details.append("No active farm plots registered.")
    else:
        score += 50
        details.append(f"{len(farms)} farm plot(s) registered.")
        
    # 3. Get Crops
    crops = await db["crops"].find({"user_id": user_id}).to_list(length=100)
    if crops:
        score += 50
        details.append(f"{len(crops)} active crop cycle(s) tracked.")
        
    # 4. Disease Logs
    disease_count = await db["disease_reports"].count_documents({"user_id": user_id})
    if disease_count > 5:
        score -= min((disease_count - 5) * 10, 150)
        details.append(f"High frequency of disease scans ({disease_count} scans).")
    elif disease_count > 0:
        score += 20
        details.append("Proactive disease monitoring.")
        
    score = max(0, min(1000, score))
    risk_tier = "Low Risk (Prime)" if score >= 750 else "Medium Risk (Standard)" if score >= 600 else "High Risk (Subprime)"
    
    # 5. Financials
    expenses_docs = await db["expenses"].find({"user_id": user_id}).to_list(length=1000)
    expenses = sum(exp.get("amount", 0) for exp in expenses_docs)
    
    revenues_docs = await db["revenues"].find({"user_id": user_id}).to_list(length=1000)
    revenues = sum(rev.get("amount", 0) for rev in revenues_docs)
    profit = revenues - expenses
    
    return {
        "farmer_name": current_user.name,
        "farmer_email": current_user.email,
        "health_score": score,
        "risk_tier": risk_tier,
        "factors": details,
        "total_farms": len(farms),
        "total_area_acres": sum(f.get("area_acres", 0) for f in farms),
        "active_crops": [c.get("crop_name", "Unknown") for c in crops],
        "financials": {
            "annual_revenue": revenues,
            "annual_expenses": expenses,
            "net_profit": profit
        },
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
