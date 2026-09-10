import os
from fastapi import Header, HTTPException, status
from dotenv import load_dotenv

load_dotenv()

EXPECTED_API_KEY = os.getenv("API_KEY", "spashta-secret-key-2026")


async def require_api_key(x_api_key: str = Header(None, alias="X-API-Key")):
    """
    FastAPI dependency to protect write/scoring endpoints against unauthorized or spam requests.
    Validates the X-API-Key header against the configured API_KEY environment variable.
    """
    if not x_api_key or x_api_key != EXPECTED_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header",
            headers={"WWW-Authenticate": "ApiKey"}
        )
    return x_api_key
