# SPASHTA (स्पष्ट) — Multilingual Explainable AI Platform

> **Audit-Ready, Citizen-Centric Explainable AI (XAI) for Regulated Financial Sectors (RBI, IRDAI, SEBI)**  
> Full-Stack Architecture: Static Frontend (Vercel) + FastAPI Backend (Render) + PostgreSQL Audit Registry (Supabase).

---

## 📌 Executive Summary

**SPASHTA (स्पष्ट)** is an Explainable AI (XAI) platform designed to eliminate algorithmic opacity ("black box" AI decisions) in India’s regulated financial sectors:
* **RBI** (Credit Card & Digital Lending Underwriting)
* **IRDAI** (Health & Motor Insurance Claim Adjudication)
* **SEBI** (Retail Investor Investment Suitability Advisory)

By combining **Aumann-Shapley Marginal Attribution Math** with real-time translation across **22 official Eighth Schedule Indian languages**, SPASHTA translates complex algorithmic outputs into plain-language advisory narratives, visual attribution charts, tamper-evident audit records, and audio stream readouts.

---

## 🏗️ System Architecture

```
                               ┌────────────────────────┐
                               │  Vercel Static Hosting │
                               │  (frontend/)           │
                               └───────────┬────────────┘
                                           │ HTTPS / JSON
                                           ▼
                               ┌────────────────────────┐
                               │  Render Web Service    │
                               │  (FastAPI Backend)     │
                               └───┬────────────────┬───┘
                                   │                │
            ┌──────────────────────┴──────┐         │ NMT Proxy (gtx/MyMemory)
            ▼                             ▼         ▼
┌────────────────────────┐   ┌──────────────────────────┐
│  Aumann-Shapley Engine │   │  Supabase PostgreSQL DB  │
│  Exact Closed-Form XAI │   │  Tamper-Evident Registry │
└────────────────────────┘   └──────────────────────────┘
```

### Free-Tier Production Stack
| Layer | Service | Purpose |
|---|---|---|
| **Frontend** | **Vercel** | Static hosting with auto-HTTPS (`frontend/` root) |
| **Backend** | **Render** | FastAPI Web Service (`backend/` root) |
| **Database** | **Supabase** | PostgreSQL audit ledger storing decision inputs & SHA-256 fingerprints |
| **Translation** | **FastAPI Proxy** | Server-side translation proxy with in-memory caching |
| **CI/CD** | **GitHub Actions** | Automated pytest validation suite on PRs and pushes |

---

## 🌟 Key Features & Capabilities

- **🧮 Aumann-Shapley Attribution Engine**: Exact closed-form Aumann-Shapley marginal contribution math ($\phi_i$) satisfying the efficiency axiom ($\sum_i \phi_i = f(x) - f(\text{baseline})$) for every input parameter.
- **🌐 22 Indian Languages Translation**: Server-side proxied NMT translation supporting Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Punjabi, Urdu, Farsi, and more.
- **🛡️ Registry-Backed Audit Certificates**: Full audit trail committed to PostgreSQL with SHA-256 digests. Scoped public verification via `/verify/{cert_id}` ensuring **zero PII leakage** under DPDP Act 2023.
- **🔊 Natural Voice Audio Stream**: Integrated Audio Advisory Toolbar with Play, Pause, Resume, and Stop controls.
- **🔒 Scoped API Key Authentication**: Protected write and scoring endpoints (`/score`, `/certificate`) guarded via `X-API-Key`.

---

## 🔌 API Reference (`backend/`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Health check & DB ping (used for Render keep-alive pinger) |
| `POST` | `/score` | Protected (`X-API-Key`) | Computes Aumann-Shapley marginal attributions ($\phi_i$) and verdict |
| `POST` | `/translate` | Public | Proxies text translation with server-side in-memory caching |
| `POST` | `/certificate` | Protected (`X-API-Key`) | Computes SHA-256 fingerprint, persists record in DB, returns cert ID |
| `GET` | `/verify/{cert_id}` | Public | Verifies certificate in DB returning strictly scoped public fields (No PII) |

---

## 🚀 How to Run Locally

### 1. Clone the repository
```bash
git clone https://github.com/Code4Uplift/spashta-ideathon-demo.git
cd spashta-ideathon-demo
```

### 2. Set up and Run the FastAPI Backend
```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run pytest test suite
pytest backend/tests -v

# Start backend server (defaults to local SQLite database)
uvicorn backend.main:app --reload --port 8000
```
Backend will be live at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).

### 3. Serve the Frontend
```bash
# In a separate terminal:
cd frontend
python -m http.server 3000
```
Open `http://localhost:3000` in your web browser.

---

## 🚢 Deployment Guide

### A. Database (Supabase)
1. Create a new free project on [Supabase](https://supabase.com).
2. Copy your PostgreSQL connection string (`DATABASE_URL`).

### B. Backend (Render)
1. Connect your GitHub repository on [Render](https://render.com).
2. Create a **New Web Service** with:
   - Root Directory: `backend/`
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
3. Add Environment Variables:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string.
   - `API_KEY`: A shared secret key (e.g., `spashta-secret-key-2026`).
   - `ALLOWED_ORIGINS`: `https://spashta.vercel.app,http://localhost:3000`

### C. Frontend (Vercel)
1. Import repository on [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend/`.
3. Deploy! Update `frontend/js/config.js` with your Render backend URL.

---

## 📄 License
This project is open-source under the MIT License. Developed for hackathon demonstration.
