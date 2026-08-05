import asyncio
import sys
import os
import random
import subprocess
import ssl
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal, engine, Base
import app.models.sql_models
import app.models.sql_commerce
from app.models.sql_commerce import SQLProduct

# Disable SSL verification for urllib
ssl._create_default_https_context = ssl._create_unverified_context

CATEGORIES = [
    'Seeds', 'Nursery', 'Organic Fertilizer', 'Fertilizer', 
    'Bio Fertilizer', 'Pesticide', 'Fungicide', 'Equipment'
]

# Prefixes and bases to generate realistic names
SEEDS = ["Tomato (F1 Hybrid)", "Wheat (HD-2967)", "Rice (Basmati 1121)", "Cotton (Bt-2)", "Maize (High Yield)", "Soybean (JS-335)", "Potato (Kufri Jyoti)", "Onion (Nashik Red)", "Chilli (Teja)", "Sunflower (KBSH-1)"]
NURSERY = ["Mango Sapling (Alphonso)", "Guava Plant (Allahabad Safeda)", "Papaya Seedling (Red Lady)", "Banana Tissue Culture (G9)", "Lemon Plant (Kagzi)", "Pomegranate Sapling (Bhagwa)", "Coconut Seedling (TxD)", "Teak Wood Sapling", "Mahogany Sapling", "Bamboo Plant"]
ORG_FERT = ["Vermicompost Base", "Neem Cake Powder", "Cow Dung Manure", "Poultry Manure", "Seaweed Extract", "Bone Meal", "Mustard Cake", "Castor Cake", "Wood Ash", "Green Manure Mix"]
FERT = ["Urea (46% N)", "DAP (18-46-0)", "MOP (60% K2O)", "SSP (16% P2O5)", "NPK (19:19:19)", "NPK (10:26:26)", "Zinc Sulphate", "Calcium Nitrate", "Boron 20%", "Sulphur 90% WDG"]
BIO_FERT = ["Rhizobium Liquid", "Azotobacter Solid", "Azospirillum Culture", "PSB (Phosphate Solubilizing)", "KSB (Potash Solubilizing)", "VAM (Mycorrhiza)", "ZSB (Zinc Solubilizing)", "Liquid Consortia", "Trichoderma Viride", "Pseudomonas Fluorescens"]
PEST = ["Imidacloprid 17.8% SL", "Chlorpyrifos 20% EC", "Cypermethrin 10% EC", "Profenofos 50% EC", "Emamectin Benzoate 5% SG", "Thiamethoxam 25% WG", "Fipronil 5% SC", "Acetamiprid 20% SP", "Spinosad 45% SC", "Lambda Cyhalothrin 5% EC"]
FUNGI = ["Mancozeb 75% WP", "Carbendazim 50% WP", "Hexaconazole 5% EC", "Propiconazole 25% EC", "Tebuconazole 25.9% EC", "Azoxystrobin 23% SC", "Copper Oxychloride 50% WP", "Sulfur 80% WDG", "Metalaxyl 8% + Mancozeb 64%", "Validamycin 3% L"]
EQUIP = ["Knapsack Sprayer 16L", "Battery Operated Sprayer", "Drip Irrigation Kit (1 Acre)", "Rotavator Blade Set", "Soil Moisture Sensor", "Pruning Shears", "Seed Drill Machine", "Weed Cutter", "Tarpaulin Sheet 120 GSM", "PH Meter Digital"]

MAPPING = {
    'Seeds': SEEDS,
    'Nursery': NURSERY,
    'Organic Fertilizer': ORG_FERT,
    'Fertilizer': FERT,
    'Bio Fertilizer': BIO_FERT,
    'Pesticide': PEST,
    'Fungicide': FUNGI,
    'Equipment': EQUIP
}

PUBLIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend', 'public', 'products')

async def seed_large_products():
    print("Starting mass product seeding...")
    
    if not os.path.exists(PUBLIC_DIR):
        os.makedirs(PUBLIC_DIR)
        
    async with engine.begin() as conn:
        print("Clearing existing products to ensure clean state...")
        await conn.execute(text("DELETE FROM inventory"))
        await conn.execute(text("DELETE FROM products"))

    async with AsyncSessionLocal() as db:
        products_to_add = []
        download_queue = []
        count = 1
        
        for category in CATEGORIES:
            names = MAPPING[category]
            for i in range(10):
                name = names[i]
                price = round(random.uniform(50.0, 5000.0), 2)
                stock = random.randint(10, 500)
                discount = random.choice([0.0, 0.0, 5.0, 10.0, 15.0])
                rating = round(random.uniform(3.5, 5.0), 1)
                reviews = random.randint(5, 150)
                is_organic = category in ['Seeds', 'Organic Fertilizer', 'Bio Fertilizer', 'Nursery']
                
                slug = "".join(c if c.isalnum() else "_" for c in name.lower())
                slug = slug.replace("__", "_").strip("_")
                filename = f"{slug}.jpg"
                filepath = os.path.join(PUBLIC_DIR, filename)
                
                new_prod = SQLProduct(
                    name=name,
                    category=category,
                    price=price,
                    description=f"Premium grade {name}. Trusted by thousands of farmers for excellent results.",
                    image_url=f"/products/{filename}",
                    stock_quantity=stock,
                    discount_percentage=discount,
                    average_rating=rating,
                    review_count=reviews,
                    is_organic=is_organic
                )
                products_to_add.append(new_prod)
                download_queue.append((name, category, filepath))
                
        db.add_all(products_to_add)
        await db.commit()
        print(f"Successfully seeded {len(products_to_add)} products to Database!")
        
        # Now download images synchronously using curl
        for i, (name, category, filepath) in enumerate(download_queue):
            if not os.path.exists(filepath):
                print(f"[{i+1}/80] Downloading {name}...")
                import urllib.parse
                prompt = f"Product photography of {name} {category}, isolated on white background, highly detailed, realistic"
                img_url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}?width=400&height=400&nologo=true"
                subprocess.run(["curl", "-s", "-L", "-o", filepath, img_url])
            else:
                print(f"[{i+1}/80] Image {name} exists.")
        
        print("All downloads complete!")

if __name__ == "__main__":
    asyncio.run(seed_large_products())
