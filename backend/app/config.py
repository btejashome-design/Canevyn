"""
Canevyn Backend Configuration
Strict security guidelines: secrets from environment, no hardcoded secrets in production.
"""

import os
import sys
import logging

logger = logging.getLogger("canevyn.config")

# Environment mode: 'development', 'testing', or 'production'
ENVIRONMENT = os.getenv("CANEVYN_ENV", "development").lower()

# Secret Key for JWT signature verification
SECRET_KEY = os.getenv("CANEVYN_SECRET_KEY")
if not SECRET_KEY:
    if ENVIRONMENT == "production":
        logger.critical("FATAL: CANEVYN_SECRET_KEY must be set in production environment!")
        sys.exit(1)
    else:
        # Development fallback with explicit notice
        SECRET_KEY = "canevyn_dev_insecure_jwt_secret_key_change_in_production_2026"
        logger.warning("Using development fallback JWT secret key. Set CANEVYN_SECRET_KEY in production.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("CANEVYN_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 7)))  # 7 days

# Regional emergency call configuration (neutral wording in UI, configurable dispatch)
REGIONAL_EMERGENCY_DISPATCH_NUMBER = os.getenv("REGIONAL_EMERGENCY_NUMBER", "sos")

API_V1_PREFIX = "/api/v1"
CORS_ORIGINS = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

def is_production() -> bool:
    return ENVIRONMENT == "production"

def is_development() -> bool:
    return ENVIRONMENT == "development"
