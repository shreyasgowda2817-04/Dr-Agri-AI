from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, List, Optional
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
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        if websocket not in self.active_connections[user_id]:
            self.active_connections[user_id].append(websocket)
        logger.info(f"User {user_id} connected. Active connections: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected.")

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Error sending message to {user_id}: {e}")

    async def broadcast(self, message: dict):
        for user_id, connections in list(self.active_connections.items()):
            for connection in list(connections):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Error broadcasting message: {e}")

manager = ConnectionManager()

def verify_ws_token(token: Optional[str]) -> Optional[str]:
    """Verify JWT for WebSocket connection and return user_id"""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        return user_id
    except Exception as e:
        logger.warning(f"WebSocket token validation error: {e}")
        return None

async def handle_notification_ws(
    websocket: WebSocket,
    user_id: Optional[str] = None,
    token: Optional[str] = None
):
    """Unified handler for all notification WebSocket connection routes."""
    await websocket.accept()

    # Resolve user_id from token or path parameter
    resolved_user_id = None
    if token:
        resolved_user_id = verify_ws_token(token)

    if not resolved_user_id and user_id:
        resolved_user_id = str(user_id)

    if not resolved_user_id:
        try:
            await websocket.send_json({"type": "ERROR", "message": "Unauthorized WebSocket connection"})
            await websocket.close(code=1008, reason="Unauthorized")
        except Exception:
            pass
        return

    await manager.connect(websocket, resolved_user_id)
    try:
        # Welcome message
        await websocket.send_json({
            "type": "INFO",
            "message": "Connected to real-time notification stream",
            "user_id": resolved_user_id
        })

        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
            else:
                logger.debug(f"Received WS message from {resolved_user_id}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, resolved_user_id)
    except Exception as e:
        logger.warning(f"WebSocket closed for {resolved_user_id}: {e}")
        manager.disconnect(websocket, resolved_user_id)

@router.websocket("/ws/notifications")
async def ws_notifications(websocket: WebSocket, token: Optional[str] = Query(None)):
    await handle_notification_ws(websocket, token=token)

@router.websocket("/ws/notifications/{user_id}")
async def ws_notifications_user(websocket: WebSocket, user_id: str, token: Optional[str] = Query(None)):
    await handle_notification_ws(websocket, user_id=user_id, token=token)

@router.websocket("/api/v1/notifications/ws/{user_id}")
async def ws_api_v1_notifications_user(websocket: WebSocket, user_id: str, token: Optional[str] = Query(None)):
    await handle_notification_ws(websocket, user_id=user_id, token=token)

@router.websocket("/notifications/ws/{user_id}")
async def ws_notifications_alias(websocket: WebSocket, user_id: str, token: Optional[str] = Query(None)):
    await handle_notification_ws(websocket, user_id=user_id, token=token)

@router.websocket("/ws/{user_id}")
async def ws_shorthand(websocket: WebSocket, user_id: str, token: Optional[str] = Query(None)):
    await handle_notification_ws(websocket, user_id=user_id, token=token)
