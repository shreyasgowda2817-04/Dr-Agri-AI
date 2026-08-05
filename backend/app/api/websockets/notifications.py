from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Dict, List
import json
import logging
from app.core.security import ALGORITHM
from app.core.config import settings
import jwt
from pydantic import ValidationError

router = APIRouter()
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps user_id to a list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"User {user_id} connected. Active connections: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected.")

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except RuntimeError:
                    pass

    async def broadcast(self, message: dict):
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except RuntimeError:
                    pass

manager = ConnectionManager()

def verify_ws_token(token: str) -> str:
    """Verify JWT for WebSocket connection and return user_id"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise ValueError("Invalid token payload")
        return user_id
    except (jwt.PyJWTError, ValidationError, ValueError) as e:
        raise ValueError(f"Authentication failed: {str(e)}")

@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket endpoint for real-time notifications.
    Client must pass JWT token in query string: ws://domain/ws/notifications?token=ey...
    """
    try:
        user_id = verify_ws_token(token)
    except ValueError as e:
        await websocket.close(code=1008, reason=str(e))
        return

    await manager.connect(websocket, user_id)
    try:
        # Send a welcome message
        await manager.send_personal_message({"type": "info", "data": "Connected to real-time notification stream"}, user_id)
        
        while True:
            # Keep connection alive, listen for client messages if needed
            data = await websocket.receive_text()
            # For now, just echo back or log
            logger.debug(f"Received WS message from {user_id}: {data}")
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
