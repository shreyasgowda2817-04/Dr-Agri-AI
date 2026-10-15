import asyncio
from app.services.ml_service import predict_image

with open("/Users/shreyasgowda/.gemini/antigravity/brain/ca39efc3-c790-4200-a236-f4758748938c/.user_uploaded/media_1791037662877.png", "rb") as f:
    img_bytes = f.read()

try:
    res = predict_image(img_bytes)
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
