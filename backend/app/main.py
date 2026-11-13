"""
Canevyn Master Application Server
FastAPI REST API, Authenticated WebSocket Telemetry Hub, and Frontend Static Server.
"""

import os
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError

from backend.app.config import API_V1_PREFIX, CORS_ORIGINS, ENVIRONMENT, REGIONAL_EMERGENCY_DISPATCH_NUMBER
from backend.app.database import init_db, get_db
from backend.app.routers import auth, devices, telemetry, sos, guardians, notifications, voice
from backend.app.services.ws_manager import ws_hub
from backend.app.services.auth_service import decode_token

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure SQLite database schema and seed fixtures exist
    init_db()
    yield

app = FastAPI(
    title="Canevyn Smart Assistive Stick API",
    description="Mission-critical backend for Canevyn User and Authorized Member mobile applications.",
    version="1.0.0",
    lifespan=lifespan
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    """Formats Pydantic 422 errors into clean, human-readable strings for mobile/web clients."""
    messages = []
    for err in exc.errors():
        msg = err.get("msg", "Validation error")
        if msg.startswith("Value error, "):
            msg = msg[len("Value error, "):]
        loc = err.get("loc", [])
        field = loc[-1] if loc and loc[-1] != "body" else ""
        if field:
            field_name = str(field).replace("_", " ").title()
            messages.append(f"{field_name}: {msg}")
        else:
            messages.append(msg)
    detail_str = ". ".join(messages)
    return JSONResponse(
        status_code=422,
        content={"detail": detail_str}
    )

# CORS middleware for mobile and browser web clients
dev_origins = list(set(CORS_ORIGINS + ["null", "http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:5173", "http://127.0.0.1:5173"]))
app.add_middleware(
    CORSMiddleware,
    allow_origins=dev_origins if ENVIRONMENT == "development" else CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$" if ENVIRONMENT == "development" else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Development No-Cache Middleware for Static Frontend and ES Modules
@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static") or request.url.path == "/" or request.url.path.endswith((".js", ".css", ".html")):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Register API v1 Routers
app.include_router(auth.router, prefix=API_V1_PREFIX)
app.include_router(devices.router, prefix=API_V1_PREFIX)
app.include_router(telemetry.router, prefix=API_V1_PREFIX)
app.include_router(sos.router, prefix=API_V1_PREFIX)
app.include_router(guardians.router, prefix=API_V1_PREFIX)
app.include_router(notifications.router, prefix=API_V1_PREFIX)
app.include_router(voice.router, prefix=API_V1_PREFIX)

@app.get(f"{API_V1_PREFIX}/config")
def get_app_config():
    """Returns deployment configuration indicating development or production boundary."""
    return {
        "environment": ENVIRONMENT,
        "is_development": ENVIRONMENT == "development",
        "emergency_dispatch_number": REGIONAL_EMERGENCY_DISPATCH_NUMBER
    }

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: Optional[str] = Query(None)
):
    """
    Authenticated real-time WebSocket connection for live telemetry and hardware SOS alerts.
    Enforces token authentication and guardian subscription authorization.
    """
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication token required")
        return

    try:
        payload = decode_token(token)
        caller_id = payload.get("sub")
        if not caller_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token claims")
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        return

    # Authorization Check: caller must be user themselves or an active authorized guardian
    is_authorized = (caller_id == user_id)
    if not is_authorized:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT id FROM guardian_relationships
            WHERE canevyn_user_id = ? AND guardian_user_id = ? AND is_active = 1 AND status = 'approved';
            """, (user_id, caller_id))
            if cursor.fetchone():
                is_authorized = True

    if not is_authorized:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized subscription to user stream")
        return

    # Register connection under the caller's ID so directed messages arrive correctly
    await ws_hub.connect(websocket, caller_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Heartbeat pong
            await websocket.send_text('{"type": "PONG", "status": "connected"}')
    except WebSocketDisconnect:
        ws_hub.disconnect(websocket, caller_id)
    except Exception:
        ws_hub.disconnect(websocket, caller_id)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Canevyn Assistive System",
        "version": "1.0.0",
        "environment": ENVIRONMENT,
        "database": "sqlite3_active",
        "password_hasher": "Argon2id"
    }

# Mount Frontend static files
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
