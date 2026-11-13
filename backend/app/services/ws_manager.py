"""
Real-time WebSocket Hub for Canevyn Telemetry & Hardware SOS Alerts
Strict Security: Scoped broadcasts only to the target Canevyn user and authorized guardians.
No global broadcast leakage.
"""

from typing import List, Dict
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger("canevyn.ws")

class WebSocketHub:
    def __init__(self):
        # Maps user_id -> List of active WebSockets for that user
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket client authenticated and connected for user {user_id}. Active sessions for user: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections and websocket in self.active_connections[user_id]:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket client disconnected for user {user_id}.")

    async def send_to_user(self, user_id: str, message: dict):
        """Sends an event specifically to a given user's active devices/sessions."""
        if user_id in self.active_connections:
            payload = json.dumps(message)
            for ws in list(self.active_connections[user_id]):
                try:
                    await ws.send_text(payload)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")

    async def broadcast_hardware_sos(self, sos_payload: dict, guardian_ids: List[str], user_id: str = None):
        """
        Critical Emergency Broadcast:
        Dispatches hardware-triggered SOS alert STRICTLY to the affected Canevyn user
        and their verified, authorized guardians.
        """
        payload_str = json.dumps({
            "type": "HARDWARE_SOS_ALERT",
            "source": "PHYSICAL_CANE_STICK",
            "data": sos_payload
        })

        # 1. Send to affected user
        if user_id and user_id in self.active_connections:
            for ws in list(self.active_connections[user_id]):
                try:
                    await ws.send_text(payload_str)
                except Exception as e:
                    logger.warn(f"Failed to send SOS to user {user_id}: {e}")

        # 2. Send strictly to active authorized guardians
        for gid in guardian_ids:
            if gid in self.active_connections:
                for ws in list(self.active_connections[gid]):
                    try:
                        await ws.send_text(payload_str)
                    except Exception as e:
                        logger.warn(f"Failed to send SOS to guardian {gid}: {e}")

    async def broadcast_event(self, event_type: str, data: dict, target_ids: List[str]):
        """Broadcasts a typed event strictly to specified authenticated user IDs."""
        if not target_ids:
            return
        payload_str = json.dumps({
            "type": event_type,
            "data": data
        })
        for target in target_ids:
            if target in self.active_connections:
                for ws in list(self.active_connections[target]):
                    try:
                        await ws.send_text(payload_str)
                    except Exception as e:
                        logger.warning(f"Failed to send {event_type} to {target}: {e}")

    async def broadcast_telemetry(self, telemetry_payload: dict, target_ids: List[str]):
        """Streams real-time LiDAR, battery, and GPS telemetry strictly to authorized recipients."""
        payload_str = json.dumps({
            "type": "TELEMETRY_UPDATE",
            "data": telemetry_payload
        })
        for target in target_ids:
            if target in self.active_connections:
                for ws in list(self.active_connections[target]):
                    try:
                        await ws.send_text(payload_str)
                    except Exception as e:
                        logger.warn(f"Failed to stream telemetry to {target}: {e}")

ws_hub = WebSocketHub()
