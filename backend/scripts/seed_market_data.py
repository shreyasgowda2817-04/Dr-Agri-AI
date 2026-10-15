import asyncio
import os
import sys
from datetime import datetime, timedelta
import random
import math

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from app.core.database import db_instance, connect_to_databases

states = {
  "Andhra Pradesh": {
    "Chittoor": ["Madanapalle", "Chittoor", "Punganur"],
    "Kurnool": ["Kurnool", "Adoni", "Yemmiganur"],
    "Guntur": ["Guntur", "Tenali"],
    "Anantapur": ["Anantapur", "Hindupur"]
  },
  "Assam": {
    "Kamrup": ["Guwahati", "Pamohi"],
    "Barpeta": ["Howly", "Barpeta Road"],
    "Nagaon": ["Nagaon", "Hojai"]
  },
  "Bihar": {
    "Patna": ["Musallahpur Hat", "Danapur"],
    "Muzaffarpur": ["Muzaffarpur", "Motipur"],
    "Gaya": ["Gaya City", "Tekari"]
  },
  "Chhattisgarh": {
    "Raipur": ["Shastri Market", "Bhatagaon"],
    "Durg": ["Durg", "Bhilai"],
    "Bilaspur": ["Bilaspur", "Tifra"]
  },
  "Gujarat": {
    "Ahmedabad": ["Jamalpur APMC", "Naroda"],
    "Surat": ["Surat APMC", "Bardoli"],
    "Rajkot": ["Rajkot APMC", "Gondal"],
    "Vadodara": ["Sayajipura", "Padra"]
  },
  "Haryana": {
    "Karnal": ["New Grain Market", "Gharaunda"],
    "Kurukshetra": ["Pipli", "Ladwa"],
    "Rohtak": ["Rohtak APMC", "Meham"]
  },
  "Himachal Pradesh": {
    "Shimla": ["Dhalli", "Rohru"],
    "Kullu": ["Kullu", "Bhuntar"],
    "Solan": ["Solan APMC", "Nalagarh"]
  },
  "Jharkhand": {
    "Ranchi": ["Daily Market", "Pandra"],
    "Dhanbad": ["Purana Bazar", "Jharia"],
    "East Singhbhum": ["Sakchi", "Bistupur"]
  },
  "Karnataka": {
    "Bengaluru": ["K.R. Market", "Yeshwanthpur", "Dasarahalli"],
    "Mysuru": ["APMC Bandipalya", "RMC Yard"],
    "Belagavi": ["Belagavi APMC", "Bailhongal"],
    "Hubballi-Dharwad": ["Amargol APMC", "Hubli"]
  },
  "Kerala": {
    "Ernakulam": ["Ernakulam Market", "Aluva"],
    "Thiruvananthapuram": ["Chalai", "Palayam"],
    "Kozhikode": ["Palayam Market", "Koyilandy"]
  },
  "Madhya Pradesh": {
    "Indore": ["Choithram Mandi", "Sanwer"],
    "Bhopal": ["Karond Mandi", "Berasia"],
    "Ujjain": ["Ujjain APMC", "Nagda"]
  },
  "Maharashtra": {
    "Nashik": ["Lasalgaon", "Pimpalgaon", "Malegaon"],
    "Pune": ["Gultekdi APMC", "Baramati", "Shirur"],
    "Mumbai": ["Vashi APMC", "Kalyan"],
    "Nagpur": ["Kalamna Market", "Cotton Market"]
  },
  "Odisha": {
    "Khordha": ["Unit-1 Market", "Jatni"],
    "Cuttack": ["Chhatra Bazar", "Choudwar"],
    "Ganjam": ["Berhampur", "Bhanjanagar"]
  },
  "Punjab": {
    "Ludhiana": ["Sabzi Mandi", "Jagraon"],
    "Amritsar": ["Amritsar APMC", "Tarn Taran"],
    "Jalandhar": ["Maqsudan", "Nakodar"]
  },
  "Rajasthan": {
    "Jaipur": ["Muhana Mandi", "Chandpole"],
    "Jodhpur": ["Jodhpur APMC", "Phalodi"],
    "Udaipur": ["Udaipur Mandi", "Fatehnagar"]
  },
  "Tamil Nadu": {
    "Chennai": ["Koyambedu", "Madhavaram"],
    "Coimbatore": ["Mettupalayam", "Pollachi"],
    "Madurai": ["Mattuthavani", "Thirumangalam"]
  },
  "Telangana": {
    "Hyderabad": ["Bowenpally", "Gudimalkapur"],
    "Nizamabad": ["Nizamabad APMC", "Bodhan"],
    "Warangal": ["Enumamula", "Narsampet"]
  },
  "Uttar Pradesh": {
    "Lucknow": ["Naveen Galla Mandi", "Dubagga"],
    "Agra": ["Achnera", "Sikandra"],
    "Varanasi": ["Pahari", "Chandua"],
    "Kanpur": ["Chakeri", "Barra"]
  },
  "Uttarakhand": {
    "Dehradun": ["Niranjanpur Mandi", "Rishikesh"],
    "Haridwar": ["Jwalapur", "Roorkee"],
    "Nainital": ["Haldwani", "Ramnagar"]
  },
  "West Bengal": {
    "Kolkata": ["Posta Market", "Sealdah"],
    "Hooghly": ["Singur", "Tarakeswar"],
    "Burdwan": ["Katwa", "Kalna"]
  }
}

def simulate_commodity(state, district, market, commodity, base_price, volatility_percent, phase_shift, drift):
    prices = []
    current_price = base_price
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    start_date = today - timedelta(days=120)  # Seed 120 days to save space/time
    
    for i in range(120):
        date = start_date + timedelta(days=i)
        day_of_year = date.timetuple().tm_yday
        seasonality = math.sin(day_of_year / 365.25 * 2 * math.pi + phase_shift) * (base_price * 0.20)
        current_price = current_price * (1 + drift)
        shock = random.uniform(-volatility_percent, volatility_percent) * current_price
        raw_price = current_price + seasonality + shock
        modal_price = round(max(raw_price, base_price * 0.3)) 
        spread = modal_price * random.uniform(0.05, 0.15)
        
        prices.append({
            "state": state,
            "district": district,
            "market": market,
            "commodity": commodity,
            "variety": "Local",
            "grade": "FAQ",
            "min_price": round(modal_price - spread),
            "max_price": round(modal_price + spread),
            "modal_price": modal_price,
            "unit": "Quintal",
            "date": date,
            "source": "Agmarknet (Demo Seed)",
            "fetched_at": datetime.utcnow()
        })
    return prices

async def main():
    await connect_to_databases()
    db = db_instance.db
    
    if db is None:
        print("Database connection failed.")
        return
        
    print("Clearing old market data...")
    await db["market_prices"].delete_many({})
    
    print("Generating simulated data for all states and mandis (this will take a few seconds)...")
    
    all_data = []
    
    # Generate data for every state/district/market
    for state, districts in states.items():
        for district, mandis in districts.items():
            for market in mandis:
                # Tomato
                all_data.extend(simulate_commodity(state, district, market, "Tomato", 2200, 0.035, 0.0, 0.0005))
                # Onion
                all_data.extend(simulate_commodity(state, district, market, "Onion", 1800, 0.04, 1.5, 0.0002))
                # Potato
                all_data.extend(simulate_commodity(state, district, market, "Potato", 1200, 0.02, 3.0, 0.0001))
    
    print(f"Generated {len(all_data)} historical price records. Inserting into MongoDB in batches...")
    
    try:
        # Batch insert to avoid document size limits
        batch_size = 10000
        for i in range(0, len(all_data), batch_size):
            batch = all_data[i:i+batch_size]
            await db["market_prices"].insert_many(batch)
            print(f"Inserted batch {i//batch_size + 1}...")
            
        print("Success! The ML Predictor will now work for ALL locations in the catalog.")
    except Exception as e:
        print(f"Error seeding data: {e}")

if __name__ == "__main__":
    asyncio.run(main())
