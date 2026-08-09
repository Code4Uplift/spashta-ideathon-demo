# SPASHTA (स्पष्ट) — Multilingual Explainable AI Platform

> **Audit-Ready, Citizen-Centric Explainable AI (XAI) for Regulated Financial Sectors (RBI, IRDAI, SEBI)**

---

## 📌 Executive Summary

**SPASHTA (स्पष्ट)** is an Explainable AI (XAI) platform designed to eliminate algorithmic opacity ("black box" AI decisions) in India’s regulated financial sectors:
* **RBI** (Credit Card & Digital Lending Underwriting)
* **IRDAI** (Health & Motor Insurance Claim Adjudication)
* **SEBI** (Retail Investor Investment Suitability Advisory)

By combining **Shapley Value Marginal Attribution Math** with real-time translation across **22 official Eighth Schedule Indian languages**, SPASHTA translates complex algorithmic outputs into plain-language advisory narratives, visual attribution charts, and audio stream readouts.

---

## 🌟 Key Features & Prototype Capabilities

- **🧮 Aumann-Shapley Attribution Engine**: Exact closed-form Aumann-Shapley marginal contribution math ($\phi_i$) — the continuous-game generalization of Shapley values (Aumann & Shapley, 1974) that underlies Integrated Gradients attribution — satisfying the efficiency axiom ($\sum_i \phi_i = f(x) - f(\text{baseline})$) for every financial input parameter.
- **🌐 22 Indian Languages Translation**: Dynamic real-time translation supporting Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Punjabi, Urdu, Farsi, and more.
- **🔊 Natural Voice Audio Stream**: Integrated Audio Advisory Toolbar with **Play**, **Pause**, **Resume**, and **Stop** controls.
- **📄 Regulatory Audit Certificates**: Tamper-evident XAI certificates (SHA-256 hash fingerprint over every decision input) featuring confidence scores, factor weight balance charts, and legal citations.
- **🎯 Interactive Vision & Roadmap Popup**: Built-in modal overlay detailing phased future production enhancements.

---

## 🧮 Explainability Methodology

The attribution engine (`js/shapley-engine.js`) computes per-feature contributions using a closed-form **Aumann-Shapley value** — the rigorous continuous-player extension of the classic (finite-player) Shapley value, and the same axiomatic basis as the "Integrated Gradients" method (Sundararajan, Taly & Yan, 2017). For this platform's linear/logistic scoring models, the integral has an exact analytic solution (the secant slope of the sigmoid between the baseline and the applicant's actual inputs), so no sampling or approximation is required.

This guarantees the **efficiency axiom** that any audit-ready explanation must satisfy:

```
sum(phi_i for all features i) == P(outcome | applicant inputs) − P(outcome | baseline inputs)
```

In plain terms: the individual factor attributions shown to the applicant always add up exactly to the actual change in their approval probability — nothing is double-counted or left unexplained.

### Where the scoring weights come from

- **RBI (Credit)** — coefficients are calibrated against publicly documented Indian lending norms: CIBIL score bands (650–749 "good", 750+ "excellent") and the FOIR range most banks/NBFCs treat as acceptable (roughly ≤50%, up to 50–55% at the outer edge). Sources checked August 2026: HDFC Bank, Axis Bank, Paisabazaar, BankBazaar published FOIR guidance; TransUnion CIBIL score-band guidance. This is **not** an official RBI-published formula — none exists publicly; RBI's Master Direction and Fair Lending Code mandate the explainability *process*, not specific scoring weights.
- **IRDAI (Claims)** and **SEBI (Suitability)** — IRDAI and SEBI likewise do not publish numeric scoring formulas; both mandate fair process and (for SEBI) that product risk match investor risk profile (Regulation 16). The coefficients here operationalize those *principles* (non-disclosure of a pre-existing condition weighs heavily, product risk should track investor risk tolerance) for demo purposes — they are illustrative, not sourced from an official published scorecard.

A production deployment would need each regulated entity's own board-approved underwriting/claims/suitability policy substituted in here — this demo's weights exist to prove the explainability and attribution *mechanism* works correctly, not to represent any real institution's actual credit or suitability policy.

---

## 🎯 Phased Project Roadmap & Ideology

### 🟢 Phase 1: Near-Term Enhancements (Easy to Implement)
* **Voice-to-Text Input (Speech-to-Text)**: Citizen voice input allowing rural applicants to dictate profile parameters directly in regional dialects.
* **QR-Verified PDF Compliance Certificates**: Cryptographically signed audit certificates with scannable QR codes for instant verification at bank branches.

### 🟡 Phase 2: Core Platform Integrations (Moderate Complexity)
* **Live Bhasini Regional Voice Synthesis (TTS)**: Direct MeitY Bhasini Text-to-Speech (TTS) pipelines for natural spoken explanations across all 22 official Indian languages.
* **Direct Core Banking (CBS) & Account Aggregator Integrations**: Direct API webhooks into Finacle, TCS BaNCS, and Account Aggregator frameworks for automated underwriting audit.

### 🔴 Phase 3: Long-Term Enterprise Scalability (Advanced Vision)
* **Multi-Agency Regulatory Expansion**: Extending XAI explainability models to PFRDA (Pensions), IBBI (Insolvency), and NABARD (Cooperative Credit).
* **Federated Privacy-Preserving XAI Engine**: On-device explainable model execution keeping sensitive citizen financial & health data private under DPDP Act 2023.

---

## 🛠️ Regulatory Compliance Alignments

- **RBI**: Master Direction on Credit Card Issuance (2022) & Fair Lending Code 2023.
- **IRDAI**: Protection of Policyholders Interests Regulations 2024.
- **SEBI**: Investment Advisers Regulations (2020 Amendment).

---

## 🚀 How to Run Locally

Since SPASHTA is built as a zero-dependency static web application, you can run it directly:

1. Clone the repository:
   ```bash
   git clone https://github.com/Code4Uplift/spashta-ideathon-demo.git
   cd spashta-ideathon-demo
   ```
2. Open `index.html` directly in your browser:
   * Double-click `index.html`, OR
   * Serve via any static web server (e.g. VS Code Live Server or `python -m http.server 8080`).

---

## 📄 License
This project is open-source under the MIT License. Developed for hackathon demonstration.
