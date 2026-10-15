import json

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

catalog = {}
for state, districts in states.items():
    catalog[state] = {}
    for district, mandis in districts.items():
        catalog[state][district] = {}
        for mandi in mandis:
            catalog[state][district][mandi] = ["Tomato", "Onion", "Potato"]

js_content = f"export const catalog = {json.dumps(catalog, indent=2)};"

with open('/Users/shreyasgowda/Documents/crop/frontend/src/pages/CommodityPrices.catalog.js', 'w') as f:
    f.write(js_content)

