import os
import sys
import re
import urllib.parse
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List
from contextlib import asynccontextmanager

# Add parent directory and current directory to sys.path for robust import resolution
current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

import httpx
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from dotenv import load_dotenv

try:
    from backend.database import get_db, init_db
    from backend.models import CertificateRecord
    from backend.schemas import (
        ScoreRequest,
        ScoreResponse,
        TranslateRequest,
        TranslateResponse,
        CertificateCreateRequest,
        CertificatePublic
    )
    from backend.shapley_engine import DOMAINS, score_domain_inputs, compute_cert_hash
    from backend.auth import require_api_key
except ImportError:
    from database import get_db, init_db
    from models import CertificateRecord
    from schemas import (
        ScoreRequest,
        ScoreResponse,
        TranslateRequest,
        TranslateResponse,
        CertificateCreateRequest,
        CertificatePublic
    )
    from shapley_engine import DOMAINS, score_domain_inputs, compute_cert_hash
    from auth import require_api_key

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="SPASHTA (स्पष्ट) Backend API",
    description="Multilingual Explainable AI API for Regulated Indian Financial Sectors (RBI, IRDAI, SEBI)",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://spashta.vercel.app"
]

env_origins = os.getenv("ALLOWED_ORIGINS", "")
if env_origins:
    custom_origins = [o.strip() for o in env_origins.split(",") if o.strip()]
    origins = list(set(default_origins + custom_origins))
else:
    origins = default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory translation cache (thread-safe in GIL / async single loop)
_translation_cache: Dict[str, str] = {}


@app.get("/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """
    Public health check endpoint.
    Performs a database ping to verify PostgreSQL / SQLite connectivity.
    Ideal for UptimeRobot and Render keep-alive pings.
    """
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok",
        "service": "SPASHTA XAI Backend",
        "version": "2.0.0",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.post("/score", response_model=ScoreResponse, tags=["XAI Scoring"], dependencies=[Depends(require_api_key)])
def compute_score(request: ScoreRequest):
    """
    Protected endpoint: Computes exact continuous Aumann-Shapley marginal attributions
    for applicant parameters across RBI, IRDAI, or SEBI frameworks.
    Guarantees efficiency axiom: sum(phi_i) == P(outcome) - P(baseline).
    """
    result = score_domain_inputs(request.domain, request.inputs)
    return ScoreResponse(**result)


@app.post("/translate", response_model=TranslateResponse, tags=["Multilingual NMT"])
async def translate_text(request: TranslateRequest):
    """
    Public endpoint: Translates text across 22 Indian languages.
    Proxies to Google GTX and MyMemory APIs server-side with an in-memory cache to prevent
    client-side CORS issues and browser rate-limiting.
    """
    source_lang = request.source_lang.lower().strip()
    target_lang = request.target_lang.lower().strip()
    raw_text = request.text.strip()

    if not raw_text or source_lang == target_lang:
        return TranslateResponse(
            translated_text=raw_text,
            source_lang=source_lang,
            target_lang=target_lang,
            cached=False
        )

    clean_text = re.sub(r"<[^>]*>", "", raw_text).strip()
    if not clean_text:
        return TranslateResponse(
            translated_text=raw_text,
            source_lang=source_lang,
            target_lang=target_lang,
            cached=False
        )

    cache_key = f"{source_lang}_{target_lang}_{clean_text}"
    if cache_key in _translation_cache:
        return TranslateResponse(
            translated_text=_translation_cache[cache_key],
            source_lang=source_lang,
            target_lang=target_lang,
            cached=True
        )

    translated_result = clean_text

    # 1. Primary: Google GTX endpoint
    try:
        encoded_query = urllib.parse.quote(clean_text)
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_lang}&tl={target_lang}&dt=t&q={encoded_query}"
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data and isinstance(data, list) and len(data) > 0 and data[0]:
                    chunks = [item[0] for item in data[0] if item and item[0]]
                    if chunks:
                        translated_result = "".join(chunks)
    except Exception:
        pass

    # 2. Fallback: MyMemory API if Google failed
    if translated_result == clean_text and target_lang != "en":
        try:
            encoded_query = urllib.parse.quote(clean_text)
            url2 = f"https://api.mymemory.translated.net/get?q={encoded_query}&langpair={source_lang}|{target_lang}"
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp2 = await client.get(url2)
                if resp2.status_code == 200:
                    data2 = resp2.json()
                    mem_trans = data2.get("responseData", {}).get("translatedText")
                    if mem_trans and mem_trans != clean_text:
                        translated_result = mem_trans
        except Exception:
            pass

    _translation_cache[cache_key] = translated_result
    return TranslateResponse(
        translated_text=translated_result,
        source_lang=source_lang,
        target_lang=target_lang,
        cached=False
    )


@app.post("/certificate", response_model=CertificatePublic, status_code=status.HTTP_201_CREATED, tags=["Audit Certificates"], dependencies=[Depends(require_api_key)])
def create_certificate(request: CertificateCreateRequest, db: Session = Depends(get_db)):
    """
    Protected endpoint: Computes SHA-256 fingerprint over exact input parameters & attributions,
    persists full audit record in PostgreSQL / SQLite, and returns scoped public certificate metadata.
    """
    domain_cfg = DOMAINS[request.domain]
    score_result = score_domain_inputs(request.domain, request.inputs)
    full_sha256, short_id = compute_cert_hash(request.domain, request.inputs, score_result)

    cert_id = f"{domain_cfg['certPrefix']}/2026/{short_id}"

    # Check if certificate record already exists
    existing = db.query(CertificateRecord).filter(CertificateRecord.cert_id == cert_id).first()
    if existing:
        return CertificatePublic.model_validate(existing)

    record = CertificateRecord(
        cert_id=cert_id,
        domain=request.domain,
        inputs=request.inputs,
        coefficients=[f["coef"] for f in domain_cfg["fields"]],
        shap_values=score_result["shap_values"],
        baseline_prob=score_result["baseline_prob"],
        full_prob=score_result["full_prob"],
        verdict=score_result["verdict"],
        sha256_hash=full_sha256,
        created_at=datetime.now(timezone.utc)
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return CertificatePublic.model_validate(record)


@app.get("/verify/{cert_id:path}", response_model=CertificatePublic, tags=["Audit Certificates"])
def verify_certificate(cert_id: str, db: Session = Depends(get_db)):
    """
    Public verification endpoint: Allows regulators, applicants, and auditors to verify
    the authentic existence and SHA-256 integrity of an issued compliance certificate.
    Returns scoped public fields only (cert_id, domain, verdict, sha256_hash, created_at).
    Does NOT leak private applicant inputs or proprietary model parameters.
    """
    record = db.query(CertificateRecord).filter(CertificateRecord.cert_id == cert_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Certificate '{cert_id}' not found in audit registry"
        )
    return CertificatePublic.model_validate(record)
