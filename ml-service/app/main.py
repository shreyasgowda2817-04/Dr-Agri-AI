from fastapi import FastAPI, UploadFile, File, HTTPException
import torch
import torchvision.transforms as transforms
import io
from PIL import Image

app = FastAPI(title="AgriVision AI - ML Microservice")

# Dummy model setup (in production, load a real trained ResNet/YOLO weights file)
# model = torch.load('model_weights.pth')
# model.eval()

# Dummy classes for demonstration
CLASSES = [
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight"
]

def transform_image(image_bytes):
    try:
        transform = transforms.Compose([
            transforms.Resize(255),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
        image = Image.open(io.BytesIO(image_bytes))
        return transform(image).unsqueeze(0)
    except Exception as e:
        raise Exception(f"Image transformation failed: {str(e)}")

@app.post("/api/v1/predict/disease")
async def predict_disease(file: UploadFile = File(...)):
    """
    Independent Microservice endpoint for heavy CNN inference.
    Takes image bytes, returns predicted disease class and confidence.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        image_bytes = await file.read()
        
        # 1. Preprocess
        # tensor = transform_image(image_bytes)
        
        # 2. Inference (Mocked for now since we don't have the real .pth file)
        # outputs = model(tensor)
        # _, y_hat = outputs.max(1)
        # predicted_idx = y_hat.item()
        
        # Simulating a prediction
        predicted_class = "Tomato___Early_blight"
        confidence = 94.5
        severity = "Medium"
        treatment = {
            "fertilizers": ["Calcium Nitrate"],
            "pesticides": ["Copper Fungicide"],
            "organic_remedies": ["Neem Oil Spray"],
            "preventive_measures": ["Crop rotation", "Proper spacing"]
        }
        
        return {
            "crop": {"name": "Tomato"},
            "disease_name": predicted_class,
            "disease_overview": {
                "disease_name": predicted_class,
                "description": "Fungal infection affecting tomato foliage and fruit.",
                "cause_pathogen": "Alternaria solani",
                "symptoms": "Dark spots with concentric rings developing on older leaves."
            },
            "diagnosis": {
                "disease_name": predicted_class,
                "confidence_score": confidence,
                "severity": severity
            },
            "confidence_score": confidence,
            "severity": severity,
            "treatment": treatment
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference Error: {str(e)}")
