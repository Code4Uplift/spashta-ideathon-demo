const LANGS = [
  { code: 'en', native: 'English', script: 'latin' },
  { code: 'hi', native: 'हिंदी (Hindi)', script: 'deva' },
  { code: 'fa', native: 'فارسی (Farsi / Persian)', script: 'arab', rtl: true },
  { code: 'bn', native: 'বাংলা (Bengali)', script: 'beng' },
  { code: 'mr', native: 'मराठी (Marathi)', script: 'deva' },
  { code: 'te', native: 'తెలుగు (Telugu)', script: 'telu' },
  { code: 'ta', native: 'தமிழ் (Tamil)', script: 'taml' },
  { code: 'gu', native: 'ગુજરાતી (Gujarati)', script: 'gujr' },
  { code: 'kn', native: 'ਕನ್ನಡ (Kannada)', script: 'knda' },
  { code: 'ml', native: 'മലയാളം (Malayalam)', script: 'mlym' },
  { code: 'ur', native: 'اردو (Urdu)', script: 'arab', rtl: true },
  { code: 'pa', native: 'ਪੰਜਾਬੀ (Punjabi)', script: 'guru' }
];

const LANG_BY_CODE = Object.fromEntries(LANGS.map(l => [l.code, l]));

const DOMAINS = {
  rbi: {
    key: 'rbi',
    name: 'RBI',
    fullName: 'Reserve Bank of India',
    certPrefix: 'RBI/XAI-CREDIT',
    // Recalibrated against published industry norms (not an official
    // RBI-mandated formula — RBI does not publish one; it mandates the
    // *process* of explainability, not the scoring weights). Grounded in:
    //  - CIBIL score bands used across Indian lenders: <650 poor/difficult,
    //    650-749 good, 750+ excellent (TransUnion CIBIL / major bank
    //    published guidance, checked Aug 2026).
    //  - FOIR: most Indian banks/NBFCs treat ≤50% as the comfortable
    //    ideal range, with 50-55% as the upper edge lenders will still
    //    accept (published FOIR guidance from HDFC Bank, Axis Bank,
    //    Paisabazaar, BankBazaar, checked Aug 2026) — a 45% FOIR is
    //    ordinary, not a red flag, so it should not by itself sink an
    //    otherwise-strong applicant.
    // With these weights, a clean-record, salaried applicant with a
    // near-perfect score and an ordinary (45%) FOIR clears approval
    // comfortably, matching how a real underwriter would treat that file.
    intercept: -4.395,
    intro: 'Evaluates applicant creditworthiness under <b>RBI Master Direction on Credit Card and Debit Card Issuance (2022)</b> & Digital Lending Guidelines.',
    citation: 'Clause 6.2 (Explainability in Automated Underwriting) & RBI Fair Lending Practices Code 2023.',
    decisionWord: {
      pos: 'CREDIT APPROVED',
      neg: 'CREDIT REJECTED'
    },
    decisionVerb: 'credit card / personal loan application',
    fields: [
      {
        key: 'score',
        label: 'CIBIL / Credit Score',
        flabel: 'Credit Score',
        icon: '📊', min: 300, max: 900, step: 5, base: 650, coef: 0.008,
        fmt: (v) => `${v}`
      },
      {
        key: 'loan_amount',
        label: 'Requested Loan Amount (₹)',
        flabel: 'Requested Loan Amount',
        icon: '💵', min: 50000, max: 2500000, step: 25000, base: 500000, coef: -0.0000008,
        fmt: (v) => `₹${Number(v).toLocaleString('en-IN')}`
      },
      {
        key: 'income',
        label: 'Monthly Income (₹)',
        flabel: 'Monthly Income',
        icon: '💰', min: 10000, max: 300000, step: 5000, base: 45000, coef: 0.000015,
        fmt: (v) => `₹${Number(v).toLocaleString('en-IN')}`
      },
      {
        key: 'foir',
        label: 'Existing Obligation (FOIR %)',
        flabel: 'Debt Ratio (FOIR)',
        icon: '⚖️', min: 10, max: 90, step: 1, base: 45, coef: -0.03,
        fmt: (v) => `${v}%`
      },
      {
        key: 'delinquency',
        label: 'Past 90-Day DPD (Delinquency)',
        flabel: 'Past 90D Delinquencies',
        icon: '⚠️', type: 'select', base: 0, coef: -1.0,
        options: [
          { v: 0, label: '0 Times (Clean Record)' },
          { v: 1, label: '1 Time Delayed' },
          { v: 2, label: '2+ Times Delayed' }
        ]
      },
      {
        key: 'emp_status',
        label: 'Employment Type',
        flabel: 'Employment Category',
        icon: '💼', type: 'select', base: 1, coef: 0.4,
        options: [
          { v: 2, label: 'Government / PSU Employee' },
          { v: 1, label: 'Salaried Corporate' },
          { v: 0.5, label: 'Self-Employed Professional' },
          { v: -0.5, label: 'Gig / Freelancer' }
        ]
      }
    ],
    presets: [
      { label: '🟢 Prime Applicant', values: { score: 790, loan_amount: 300000, income: 120000, foir: 25, delinquency: 0, emp_status: 2 } },
      { label: '🟡 Borderline Profile', values: { score: 670, loan_amount: 600000, income: 45000, foir: 52, delinquency: 0, emp_status: 1 } },
      { label: '🔴 High Risk Defaulter', values: { score: 540, loan_amount: 1500000, income: 25000, foir: 75, delinquency: 2, emp_status: -0.5 } }
    ]
  },

  irdai: {
    key: 'irdai',
    name: 'IRDAI',
    fullName: 'Insurance Regulatory & Development Authority of India',
    certPrefix: 'IRDAI/XAI-CLAIM',
    // IRDAI does not publish a numeric claims-scoring formula either —
    // its 2024 regulations mandate fair, transparent, non-discriminatory
    // claims *process*, not specific weights. These coefficients are
    // illustrative and directionally aligned with well-established
    // insurance practice rather than sourced from an official published
    // formula: non-disclosure of a pre-existing condition is treated as
    // the single heaviest negative factor (mirrors Section 45 of the
    // Insurance Act, 1938, under which non-disclosure can void a claim),
    // cashless network facilities settle faster with fewer contested
    // claims than reimbursement claims, and a high anomaly/fraud-risk
    // index dominates once it crosses into clearly suspicious territory.
    intercept: 0.75,
    intro: 'Evaluates health & motor insurance claim settlement validity under <b>IRDAI Protection of Policyholders Interests Regulations 2024</b>.',
    citation: 'Section 14(2) (Fair & Transparent Automated Claims Adjudication) & Policyholder Protection Act.',
    decisionWord: {
      pos: 'CLAIM APPROVED',
      neg: 'CLAIM FLAGGED / REJECTED'
    },
    decisionVerb: 'insurance claim settlement',
    fields: [
      {
        key: 'tenure',
        label: 'Policy Vintage (Years)',
        flabel: 'Policy Tenure',
        icon: '📅', min: 0, max: 15, step: 0.5, base: 3, coef: 0.12,
        fmt: (v) => `${v} Yrs`
      },
      {
        key: 'amount',
        label: 'Claim Amount (₹)',
        flabel: 'Claim Value',
        icon: '💳', min: 10000, max: 1000000, step: 10000, base: 150000, coef: -0.0000015,
        fmt: (v) => `₹${Number(v).toLocaleString('en-IN')}`
      },
      {
        key: 'network',
        label: 'Network Hospital / Garage',
        flabel: 'Network Facility Status',
        icon: '🏥', type: 'toggle', base: 1, coef: 0.9
      },
      {
        key: 'pre_existing',
        label: 'Pre-existing Disease Declared',
        flabel: 'Pre-existing Condition Disclosure',
        icon: '📋', type: 'toggle', base: 1, coef: 1.6
      },
      {
        key: 'fraud_score',
        label: 'Anomaly / Risk Index (%)',
        flabel: 'Claim Anomaly Score',
        icon: '🔍', min: 0, max: 100, step: 5, base: 15, coef: -0.062,
        fmt: (v) => `${v}%`
      }
    ],
    presets: [
      { label: '🟢 Genuine Cashless Claim', values: { tenure: 5, amount: 85000, network: 1, pre_existing: 1, fraud_score: 5 } },
      { label: '🟡 Non-Network Delay', values: { tenure: 2, amount: 250000, network: 0, pre_existing: 1, fraud_score: 35 } },
      { label: '🔴 Suspicious Claim', values: { tenure: 0.5, amount: 650000, network: 0, pre_existing: 0, fraud_score: 85 } }
    ]
  },

  sebi: {
    key: 'sebi',
    name: 'SEBI',
    fullName: 'Securities and Exchange Board of India',
    certPrefix: 'SEBI/XAI-SUIT',
    // SEBI's Investment Advisers Regulations, 2013 (Regulation 16, as
    // amended 2020) mandate that advice and products must be "suitable
    // and appropriate to the risk profile of the client" — but SEBI
    // does not publish a numeric suitability-scoring formula; individual
    // advisers build their own risk-profiling scorecards to satisfy that
    // principle. These coefficients operationalize that same principle
    // (product risk must not outrun the investor's own risk tolerance)
    // rather than reproducing an official published formula.
    intercept: 0.3,
    intro: 'Evaluates retail investor risk suitability for structured products under <b>SEBI Investment Advisers Regulations (2020 Amendment)</b>.',
    citation: 'Regulation 16 (Suitability & Risk Profiling of Retail Investors) & SEBI Cybersecurity Circular.',
    decisionWord: {
      pos: 'PRODUCT SUITABLE',
      neg: 'RISK MISMATCH / UNSUITABLE'
    },
    decisionVerb: 'investment product advisory recommendation',
    fields: [
      {
        key: 'risk_appetite',
        label: 'Investor Risk Tolerance (1-100)',
        flabel: 'Risk Tolerance Score',
        icon: '🎯', min: 10, max: 100, step: 5, base: 60, coef: 0.045,
        fmt: (v) => `${v}/100`
      },
      {
        key: 'income',
        label: 'Annual Net Worth / Income (₹)',
        flabel: 'Annual Net Worth',
        icon: '💵', min: 200000, max: 5000000, step: 100000, base: 1200000, coef: 0.0000004,
        fmt: (v) => `₹${(v / 100000).toFixed(1)} Lakh`
      },
      {
        key: 'concentration',
        label: 'Portfolio Concentration (%)',
        flabel: 'Portfolio Exposure',
        icon: '📊', min: 5, max: 90, step: 5, base: 30, coef: -0.025,
        fmt: (v) => `${v}%`
      },
      {
        key: 'horizon',
        label: 'Investment Horizon (Years)',
        flabel: 'Investment Tenure',
        icon: '⏳', min: 1, max: 20, step: 1, base: 7, coef: 0.1,
        fmt: (v) => `${v} Yrs`
      },
      {
        key: 'risk_category',
        label: 'Product Risk Meter Level',
        flabel: 'Product Risk Category',
        icon: '📈', type: 'select', base: 3, coef: -0.9,
        options: [
          { v: 1, label: 'Low Risk (Liquid / G-Sec)' },
          { v: 3, label: 'Moderate Risk (Balanced Funds)' },
          { v: 5, label: 'Very High Risk (Derivative / Crypto)' }
        ]
      }
    ],
    presets: [
      { label: '🟢 Suitable Balanced Investor', values: { risk_appetite: 75, income: 1800000, concentration: 25, horizon: 8, risk_category: 3 } },
      { label: '🟡 Conservative Investor', values: { risk_appetite: 45, income: 800000, concentration: 40, horizon: 4, risk_category: 3 } },
      { label: '🔴 High Risk Mismatch', values: { risk_appetite: 20, income: 300000, concentration: 80, horizon: 1, risk_category: 5 } }
    ]
  }
};
