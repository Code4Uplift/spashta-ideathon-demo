import os
import sys
import re
import json
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
        CertificatePublic,
        AccountAggregatorWebhookPayload,
        AccountAggregatorResponse,
        VoiceIntentRequest,
        VoiceIntentResponse
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
        CertificatePublic,
        AccountAggregatorWebhookPayload,
        AccountAggregatorResponse,
        VoiceIntentRequest,
        VoiceIntentResponse
    )
    from shapley_engine import DOMAINS, score_domain_inputs, compute_cert_hash
    from auth import require_api_key

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        print("✓ Database initialized successfully.")
    except Exception as e:
        print(f"⚠️ Warning: Database connection failed during startup ({e}).")
        print("Backend is running with local fallback.")
    yield


app = FastAPI(
    title="SPASHTA (स्पष्ट) Backend API",
    description="Multilingual Explainable AI API for 6 Regulated Indian Financial Sectors (RBI, IRDAI, SEBI, PFRDA, IBBI, NABARD)",
    version="2.5.0",
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
    "https://spashta.vercel.app",
    "https://spashta-seven.vercel.app",
    "https://spashta-ideathon-demo.vercel.app"
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
    allow_origin_regex=r"https:\/\/.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory translation cache (thread-safe in GIL / async single loop)
_translation_cache: Dict[str, str] = {}


@app.get("/", tags=["Root"])
def root():
    """
    Root endpoint returning service identity and quick links to /docs and /health.
    """
    return {
        "status": "ok",
        "service": "SPASHTA (स्पष्ट) Explainable AI Backend API",
        "version": "2.5.0",
        "docs": "/docs",
        "health": "/health",
        "sectors": ["RBI", "IRDAI", "SEBI", "PFRDA", "IBBI", "NABARD"]
    }


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
        "version": "2.5.0",
        "sectors": ["RBI", "IRDAI", "SEBI", "PFRDA", "IBBI", "NABARD"],
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.post("/score", response_model=ScoreResponse, tags=["XAI Scoring"], dependencies=[Depends(require_api_key)])
def compute_score(request: ScoreRequest):
    """
    Protected endpoint: Computes exact continuous Aumann-Shapley marginal attributions
    for applicant parameters across RBI, IRDAI, SEBI, PFRDA, IBBI, or NABARD frameworks.
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

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
    }

    translated_result = clean_text

    # 1. Primary: Google GTX with browser headers
    try:
        encoded_query = urllib.parse.quote(clean_text)
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_lang}&tl={target_lang}&dt=t&q={encoded_query}"
        async with httpx.AsyncClient(timeout=6.0, headers=headers) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data and isinstance(data, list) and len(data) > 0 and data[0]:
                    chunks = [item[0] for item in data[0] if item and item[0]]
                    if chunks:
                        cand = "".join(chunks).strip()
                        if cand and cand != clean_text:
                            translated_result = cand
    except Exception:
        pass

    # 2. Fallback: MyMemory API with verified email parameter
    if translated_result == clean_text and target_lang != "en":
        try:
            encoded_query = urllib.parse.quote(clean_text)
            url2 = f"https://api.mymemory.translated.net/get?q={encoded_query}&langpair={source_lang}|{target_lang}&de=spashta.audit.ai@gmail.com"
            async with httpx.AsyncClient(timeout=5.0, headers=headers) as client:
                resp2 = await client.get(url2)
                if resp2.status_code == 200:
                    data2 = resp2.json()
                    mem_trans = data2.get("responseData", {}).get("translatedText", "").strip()
                    if mem_trans and not mem_trans.upper().startswith("MYMEMORY WARNING") and mem_trans != clean_text:
                        translated_result = mem_trans
        except Exception:
            pass

    # Only cache successful translations
    if translated_result != clean_text:
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

    # Try saving to database; if DB unreachable, return ephemeral certificate
    try:
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
    except Exception as db_err:
        print(f"Warning: Could not persist to database ({db_err}). Returning ephemeral certificate.")
        return CertificatePublic(
            cert_id=cert_id,
            domain=request.domain,
            verdict=score_result["verdict"],
            sha256_hash=full_sha256,
            created_at=datetime.now(timezone.utc)
        )


@app.get("/verify/{cert_id:path}", response_model=CertificatePublic, tags=["Audit Certificates"])
def verify_certificate(cert_id: str, db: Session = Depends(get_db)):
    """
    Public verification endpoint: Allows regulators, applicants, and auditors to verify
    the authentic existence and SHA-256 integrity of an issued compliance certificate.
    Returns scoped public fields only (cert_id, domain, verdict, sha256_hash, created_at).
    Does NOT leak private applicant inputs or proprietary model parameters under DPDP Act 2023.
    """
    try:
        record = db.query(CertificateRecord).filter(CertificateRecord.cert_id == cert_id).first()
        if record:
            return CertificatePublic.model_validate(record)
    except Exception as e:
        print(f"Database query error during verification: {e}")

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Certificate '{cert_id}' not found in audit registry"
    )


@app.post("/webhook/account-aggregator", response_model=AccountAggregatorResponse, tags=["Core Banking (CBS) & AA Webhook"])
def account_aggregator_webhook(payload: AccountAggregatorWebhookPayload):
    """
    Core Banking (CBS) & Account Aggregator (AA) Webhook Receiver.
    Simulates automated ingestion of verified banking statement artifacts (e.g. from Finacle / TCS BaNCS / Sahamati AA).
    Extracts underwriting financial parameters and returns instant explainable attribution scores.
    """
    domain = payload.domain
    domain_cfg = DOMAINS[domain]
    fin = payload.financial_data

    # Map incoming CBS/AA financial data to domain fields
    extracted_inputs = {}
    for f in domain_cfg["fields"]:
        key = f["key"]
        if key in fin:
            extracted_inputs[key] = float(fin[key])
        else:
            extracted_inputs[key] = float(f["base"])

    score_result = score_domain_inputs(domain, extracted_inputs)

    return AccountAggregatorResponse(
        status="PROCESSED_SUCCESSFULLY",
        consent_handle=payload.consent_handle,
        extracted_parameters=extracted_inputs,
        score_result=ScoreResponse(**score_result),
        verified_at=datetime.now(timezone.utc)
    )


VOICE_PARSER_SYSTEM_PROMPT = """You are the intelligent natural language voice parser for SPASHTA, India's explainable AI underwriting engine.
You understand spoken user commands in ANY Indian language or dialect (English, Hindi, Gujarati, Marathi, Tamil, Telugu, Bengali, Kannada, Malayalam, Urdu, Marwari, Hinglish, etc.).

Analyze the user's spoken sentence and output a single JSON object with the following fields:
1. "domain": One of "rbi", "irdai", "sebi", "pfrda", "ibbi", "nabard". If no authority/sector is mentioned, retain the user's current domain.
   - rbi: credit card, personal loan, CIBIL, credit score, debt, bank (कर्ज, लोन, बैंक, सिबिल)
   - irdai: insurance, health/motor claim, policy vintage/tenure, cashless network, pre-existing disease, anomaly/fraud (बीमा, विमा, क्लेम, पॉलिसी, दावा)
   - sebi: stocks, mutual funds, investments, annual net worth/income, risk tolerance, portfolio concentration, horizon (शेयर, निवेश, स्टॉक, बाजार, संपत्ति, उत्पन्न)
   - pfrda: NPS, retirement, pension, age, monthly savings/contribution, equity allocation (पेंशन, पेन्शन, निवृत्ती, उम्र, वय, एनपीएस)
   - ibbi: corporate insolvency, resolution enterprise value (₹ Cr), liquidation coverage, timeline months, recovery (दिवालिया, समाधान, परिसमापन, एंटरप्राइज)
   - nabard: Kisan Credit Card, cultivable land (acres), harvest/crop yield, moneylender debt, irrigation, PMFBY (किसान, शेती, जमीन, फसल, पीक, एकर)

2. "action": Optional action string or null. Allowed values: "compute", "reset", "speak", "stop_audio", "privacy".

3. "parameters": Dictionary of numeric field values extracted from speech.
   Supported keys per domain:
   - rbi: score (300-900), loan_amount (₹), income (monthly ₹), foir (% 10-90), delinquency (0, 1, 2), emp_status (2, 1, 0.5, -0.5)
   - irdai: tenure (policy vintage in years, 0-15), amount (claim ₹), network (1 or 0), pre_existing (1 or 0), fraud_score (% 0-100)
   - sebi: risk_appetite (10-100), income (annual net worth ₹), concentration (% 5-90), horizon (years 1-20), risk_category (1, 3, 5)
   - pfrda: age (18-70), monthly_contribution (monthly ₹), equity_allocation (% 5-75), pension_target (target monthly ₹), corpus_index (10-100)
   - ibbi: ev_amount (resolution enterprise value in ₹ Crores directly, e.g. 500 cr -> 500), liquidation_coverage (% 50-200), timeline_months (3-36), op_creditor_recovery (% 10-100), promoter_track (3, 1, -1)
   - nabard: land_holding (cultivable land in Acres, e.g. 10), crop_value (annual harvest yield ₹), informal_debt (% 0-80), irrigation_status (1 or 0), crop_insurance (1 or 0)
   * Note on Indian units: 1 lakh = 100,000, 1 crore = 10,000,000, 1 thousand/hazar = 1,000.

4. "feedback": A concise, natural confirmation message in English explaining what was done.

Respond ONLY with valid JSON. Do not include markdown tags, codeblocks, or extra explanation.
Example:
{"domain": "sebi", "action": null, "parameters": {"income": 500000}, "feedback": "Switched to SEBI and set Annual Net Worth to ₹5,00,000"}"""


def parse_voice_intent_heuristic(raw_text: str, current_domain: str = "rbi") -> VoiceIntentResponse:
    lower = raw_text.lower().strip()

    # Action detection
    if any(k in lower for k in ["compute", "calculate", "explain", "गणना", "हिसाब", "स्पष्टीकरण"]):
        return VoiceIntentResponse(action="compute", feedback="Computing Aumann-Shapley explanations...", engine="heuristic_fallback")
    if any(k in lower for k in ["reset", "clear", "रीसेट", "पूर्ववत"]):
        return VoiceIntentResponse(action="reset", feedback="Reset parameters to baseline defaults", engine="heuristic_fallback")
    if any(k in lower for k in ["play", "listen", "speak", "audio", "सुनाओ", "ऐका"]):
        return VoiceIntentResponse(action="speak", feedback="Playing audio explanation", engine="heuristic_fallback")
    if any(k in lower for k in ["stop", "pause", "शांत", "रोको"]):
        return VoiceIntentResponse(action="stop_audio", feedback="Audio playback stopped", engine="heuristic_fallback")
    if any(k in lower for k in ["privacy", "shield", "dpdp", "गोपनीयता"]):
        return VoiceIntentResponse(action="privacy", feedback="Toggled DPDP privacy mode", engine="heuristic_fallback")

    # Domain detection
    detected_domain = None
    if any(k in lower for k in ["sebi", "stock", "stocks", "trading", "invest", "portfolio", "शेयर", "शेअर", "बाजार", "निवेश", "गुंतवणूक"]):
        detected_domain = "sebi"
    elif any(k in lower for k in ["irdai", "insurance", "claim", "health", "hospital", "vintage", "बीमा", "विमा", "क्लेम", "दावा", "पॉलिसी"]):
        detected_domain = "irdai"
    elif any(k in lower for k in ["rbi", "reserve bank", "credit", "loan", "cibil", "बैंक", "बँक", "कर्ज", "ऋण", "लोन", "सिबिल"]):
        detected_domain = "rbi"
    elif any(k in lower for k in ["pfrda", "pension", "retirement", "nps", "annuity", "पेंशन", "पेन्शन", "निवृत्ती", "एनपीएस"]):
        detected_domain = "pfrda"
    elif any(k in lower for k in ["ibbi", "insolvency", "bankruptcy", "liquidation", "resolution", "enterprise", "दिवालिया", "दिवाळखोरी", "परिसमापन"]):
        detected_domain = "ibbi"
    elif any(k in lower for k in ["nabard", "kisan", "farmer", "agriculture", "agri", "kcc", "land", "crop", "किसान", "शेतकरी", "शेती", "कृषी", "जमीन", "फसल", "पीक"]):
        detected_domain = "nabard"

    target_domain = detected_domain or current_domain

    word_map = [
        ("zero", 0), ("shunya", 0), ("शून्य", 0),
        ("one", 1), ("ek", 1), ("एक", 1),
        ("two", 2), ("do", 2), ("don", 2), ("दो", 2), ("दोन", 2),
        ("three", 3), ("teen", 3), ("तीन", 3),
        ("four", 4), ("char", 4), ("चार", 4),
        ("five", 5), ("panch", 5), ("paanch", 5), ("paach", 5), ("पांच", 5), ("पाँच", 5), ("पाच", 5),
        ("six", 6), ("chhah", 6), ("saha", 6), ("छह", 6), ("सहा", 6),
        ("seven", 7), ("saat", 7), ("सात", 7),
        ("eight", 8), ("aath", 8), ("आठ", 8),
        ("nine", 9), ("nau", 9), ("नौ", 9), ("नऊ", 9),
        ("ten", 10), ("das", 10), ("daha", 10), ("दस", 10), ("दहा", 10),
        ("fifteen", 15), ("pandrah", 15), ("पंद्रह", 15), ("पंधरा", 15),
        ("twenty", 20), ("bees", 20), ("बीस", 20), ("वीस", 20),
        ("twenty five", 25), ("pachis", 25), ("पच्चीस", 25), ("पंचवीस", 25),
        ("thirty", 30), ("tees", 30), ("तीस", 30),
        ("forty", 40), ("chalis", 40), ("चालीस", 40), ("चाळीस", 40),
        ("fifty", 50), ("pachas", 50), ("पचास", 50), ("पन्नास", 50),
        ("seventy", 70), ("sattar", 70), ("सत्तर", 70),
        ("eighty", 80), ("assi", 80), ("अस्सी", 80),
        ("ninety", 90), ("nabbe", 90), ("नब्बे", 90),
        ("hundred", 100), ("sau", 100), ("shambhar", 100), ("सौ", 100), ("शंभर", 100)
    ]
    norm_text = lower
    for w, v in word_map:
        norm_text = re.sub(r"(^|[^a-zA-Z0-9\u0900-\u097F])" + re.escape(w) + r"(?=$|[^a-zA-Z0-9\u0900-\u097F])", r"\g<1>" + str(v), norm_text, flags=re.IGNORECASE)

    extracted_num = None
    raw_num = None
    raw_unit = None

    crore_m = re.search(r"(\d+(?:\.\d+)?)\s*(?:crore|crores|cr|करोड़|कोटी)", norm_text, re.IGNORECASE)
    lakh_m = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|लाख|লাখ)", norm_text, re.IGNORECASE)
    thousand_m = re.search(r"(\d+(?:\.\d+)?)\s*(?:k|thousand|thousands|हजार|हज़ार)", norm_text, re.IGNORECASE)
    raw_m = re.search(r"(\d+(?:\.\d+)?)", norm_text)

    if crore_m:
        raw_num = float(crore_m.group(1))
        extracted_num = raw_num * 10000000
        raw_unit = "crore"
    elif lakh_m:
        raw_num = float(lakh_m.group(1))
        extracted_num = raw_num * 100000
        raw_unit = "lakh"
    elif thousand_m:
        raw_num = float(thousand_m.group(1))
        extracted_num = raw_num * 1000
        raw_unit = "thousand"
    elif raw_m:
        raw_num = float(raw_m.group(1))
        extracted_num = raw_num

    params = {}
    matched_key = None

    if target_domain == "sebi":
        if any(k in lower for k in ["income", "net worth", "networth", "wealth", "annual", "संपत्ति", "संपत्ती", "नेटवर्थ", "आय", "उत्पन्न", "कमाई"]):
            matched_key = "income"
        elif any(k in lower for k in ["risk", "tolerance", "appetite", "जोखिम", "जोखीम", "रिस्क"]):
            matched_key = "risk_appetite"
        elif any(k in lower for k in ["horizon", "tenure", "holding", "कालावधी", "मुदत"]):
            matched_key = "horizon"
    elif target_domain == "irdai":
        if any(k in lower for k in ["tenure", "vintage", "policy vintage", "year", "years", "वर्ष", "साल", "वर्षे", "कालावधी"]):
            matched_key = "tenure"
        elif any(k in lower for k in ["claim", "amount", "bill", "दावा", "दाव्याची", "क्लेम", "रक्कम"]):
            matched_key = "amount"
        elif any(k in lower for k in ["fraud", "anomaly", "suspicion", "धोखाधड़ी", "फ्रॉड", "जोखिम"]):
            matched_key = "fraud_score"
    elif target_domain == "rbi":
        if any(k in lower for k in ["cibil", "score", "rating", "सिबिल", "स्कोर", "पत"]):
            matched_key = "score"
        elif any(k in lower for k in ["loan", "borrow", "debt", "कर्ज", "ऋण", "लोन"]):
            matched_key = "loan_amount"
        elif any(k in lower for k in ["income", "salary", "wage", "pay", "monthly", "आय", "वेतन", "पगार", "कमाई", "आमदनी"]):
            matched_key = "income"
    elif target_domain == "pfrda":
        if any(k in lower for k in ["age", "years old", "वय", "उम्र", "आयु"]):
            matched_key = "age"
        elif any(k in lower for k in ["contribution", "nps", "savings", "अंशदान", "बचत"]):
            matched_key = "monthly_contribution"
    elif target_domain == "ibbi":
        if any(k in lower for k in ["enterprise", "resolution value", "ev", "व्हॅल्यू", "मूल्य"]):
            matched_key = "ev_amount"
        elif any(k in lower for k in ["timeline", "month", "months", "महिने", "महीने"]):
            matched_key = "timeline_months"
    elif target_domain == "nabard":
        if any(k in lower for k in ["land", "acre", "acres", "farmland", "जमीन", "शेती", "एकर", "एकड़"]):
            matched_key = "land_holding"
        elif any(k in lower for k in ["crop", "yield", "harvest", "produce", "उत्पन्न", "पीक", "फसल"]):
            matched_key = "crop_value"

    # Cross domain checks if not found
    if not matched_key:
        if any(k in lower for k in ["policy vintage", "vintage", "पॉलिसी विंटेज"]):
            target_domain = "irdai"
            matched_key = "tenure"
        elif any(k in lower for k in ["cibil", "सिबिल"]):
            target_domain = "rbi"
            matched_key = "score"
        elif any(k in lower for k in ["land", "acre", "acres", "जमीन", "शेती", "एकड़", "एकर"]):
            target_domain = "nabard"
            matched_key = "land_holding"
        elif any(k in lower for k in ["enterprise", "resolution value", "ev amount", "एंटरप्राइज"]):
            target_domain = "ibbi"
            matched_key = "ev_amount"
        elif any(k in lower for k in ["age", "उम्र", "वय"]):
            target_domain = "pfrda"
            matched_key = "age"

    if matched_key and extracted_num is not None:
        val = raw_num if (target_domain == "ibbi" and matched_key == "ev_amount" and raw_unit == "crore") else extracted_num
        domain_cfg = DOMAINS.get(target_domain, {})
        for f in domain_cfg.get("fields", []):
            if f["key"] == matched_key:
                min_v = f.get("min", float("-inf"))
                max_v = f.get("max", float("inf"))
                val = max(min_v, min(max_v, val))
                params[matched_key] = float(val)
                break

    feedback = f"Switched to {target_domain.upper()}"
    if params:
        for k, v in params.items():
            feedback += f" and set {k} to {v:g}"

    return VoiceIntentResponse(
        domain=target_domain,
        parameters=params,
        feedback=feedback,
        engine="heuristic_fallback"
    )


@app.post("/voice-intent", response_model=VoiceIntentResponse, tags=["Multilingual Speech & Voice Intent"])
async def voice_intent_endpoint(payload: VoiceIntentRequest):
    """
    Campus LLM-powered Natural Language & Dialect Voice Parser.
    Connects to TCET Centre of Excellence (CoE) AI Gateway (NVIDIA DGX Spark workstation running Qwen3.6-35B-A3B)
    with sub-300ms thinking-disabled inference for rich Indian dialect comprehension.
    Gracefully falls back to heuristic engine if key is omitted or server busy.
    """
    coe_key = os.getenv("COE_AI_KEY") or os.getenv("AI_KEY") or os.getenv("TCET_AI_KEY")
    coe_base_url = os.getenv("COE_AI_BASE_URL", "https://ai.tcetcercd.in/v1").rstrip("/")

    if coe_key:
        try:
            req_body = {
                "model": "qwen3.6",
                "messages": [
                    {"role": "system", "content": VOICE_PARSER_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": f"User speech: '{payload.text}'. Current active domain: '{payload.current_domain}'. Spoken language code: '{payload.language}'."
                    }
                ],
                "temperature": 0.1,
                "max_tokens": 250,
                "extra_body": {
                    "chat_template_kwargs": {
                        "enable_thinking": False
                    }
                }
            }
            headers = {
                "Authorization": f"Bearer {coe_key.strip()}",
                "Content-Type": "application/json"
            }
            async with httpx.AsyncClient(timeout=4.5) as client:
                resp = await client.post(f"{coe_base_url}/chat/completions", json=req_body, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                    clean_json_str = re.sub(r"^```json\s*", "", raw_content, flags=re.IGNORECASE)
                    clean_json_str = re.sub(r"```$", "", clean_json_str).strip()
                    parsed = json.loads(clean_json_str)

                    target_domain = parsed.get("domain") or payload.current_domain
                    if target_domain not in DOMAINS:
                        target_domain = payload.current_domain

                    sanitized_params = {}
                    domain_cfg = DOMAINS[target_domain]
                    field_map = {f["key"]: f for f in domain_cfg["fields"]}

                    for k, v in parsed.get("parameters", {}).items():
                        if k in field_map:
                            try:
                                float_v = float(v)
                                f = field_map[k]
                                min_v = f.get("min", float("-inf"))
                                max_v = f.get("max", float("inf"))
                                sanitized_params[k] = max(min_v, min(max_v, float_v))
                            except (ValueError, TypeError):
                                pass

                    return VoiceIntentResponse(
                        domain=target_domain,
                        action=parsed.get("action"),
                        parameters=sanitized_params,
                        feedback=parsed.get("feedback", f"Processed voice command for {target_domain.upper()}"),
                        engine="tcet_coe_qwen3.6"
                    )
        except Exception as e:
            print(f"Notice: CoE AI Gateway call failed or timed out ({e}). Falling back to heuristic voice parser.")

    # Graceful Fallback
    return parse_voice_intent_heuristic(payload.text, payload.current_domain)
