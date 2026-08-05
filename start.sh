#!/bin/bash

echo "🌱 Starting AgriVision Ecosystem..."

# Start Backend in the background
echo "🚀 Booting up Python Backend (Port 8000)..."
cd backend
source env/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait a second to ensure backend starts smoothly
sleep 2

# Start Frontend in the foreground
echo "💻 Booting up React Frontend (Port 5173)..."
cd frontend
npm run dev

# If the user stops the frontend (Ctrl+C), kill the backend too
kill $BACKEND_PID
