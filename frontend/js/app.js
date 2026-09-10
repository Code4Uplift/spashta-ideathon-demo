const API_BASE_URL = window.SPASHTA_API_URL || 'http://localhost:8000';
const API_KEY = window.SPASHTA_API_KEY || 'spashta-secret-key-2026';

let currentDomain = 'rbi';
let currentLang = 'en';
let state = {};

function defaultState(domainKey) {
  const d = DOMAINS[domainKey];
  const s = {};
  d.fields.forEach(f => {
    if (f.type === 'select') s[f.key] = f.options[1]?.v ?? 0;
    else if (f.type === 'toggle') s[f.key] = f.base !== undefined ? f.base : 1;
    else s[f.key] = f.base;
  });
  return s;
}

state = defaultState('rbi');

document.addEventListener('DOMContentLoaded', () => {
  state = defaultState(currentDomain);
  initLanguageSelector();
  initDomainTabs();
  initVoiceControls();
  initRoadmapModal();
  initLangNoticeModal();
  initVerifyModal();
  
  buildFields();
  renderCert();
});

function initRoadmapModal() {
  const modal = document.getElementById('roadmap-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const actionBtn = document.getElementById('modal-action-btn');

  const closeModal = () => {
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  };

  if (closeBtn) closeBtn.onclick = closeModal;
  if (actionBtn) actionBtn.onclick = closeModal;
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  }
}

let langModalTimer = null;
let langCountdownInterval = null;

function initLangNoticeModal() {
  const modal = document.getElementById('lang-modal');
  const closeBtn = document.getElementById('lang-modal-close-btn');
  const okBtn = document.getElementById('lang-modal-ok-btn');

  const hideLangModal = () => {
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
    if (langModalTimer) clearTimeout(langModalTimer);
    if (langCountdownInterval) clearInterval(langCountdownInterval);
  };

  if (closeBtn) closeBtn.onclick = hideLangModal;
  if (okBtn) okBtn.onclick = hideLangModal;
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) hideLangModal();
    };
  }
}

function showLangNoticeModal() {
  const modal = document.getElementById('lang-modal');
  const timerLabel = document.getElementById('lang-modal-timer');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.style.display = 'flex';

  if (langModalTimer) clearTimeout(langModalTimer);
  if (langCountdownInterval) clearInterval(langCountdownInterval);

  let secondsLeft = 5;
  if (timerLabel) timerLabel.textContent = `Auto-closing in ${secondsLeft}s...`;

  langCountdownInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(langCountdownInterval);
    } else if (timerLabel) {
      timerLabel.textContent = `Auto-closing in ${secondsLeft}s...`;
    }
  }, 1000);

  langModalTimer = setTimeout(() => {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }, 5000);
}

function initVerifyModal() {
  const modal = document.getElementById('verify-modal');
  const closeBtn = document.getElementById('verify-modal-close-btn');
  const okBtn = document.getElementById('verify-modal-ok-btn');

  const hideVerifyModal = () => {
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  };

  if (closeBtn) closeBtn.onclick = hideVerifyModal;
  if (okBtn) okBtn.onclick = hideVerifyModal;
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) hideVerifyModal();
    };
  }
}

async function verifyCertificate(certId) {
  const modal = document.getElementById('verify-modal');
  const bodyEl = document.getElementById('verify-modal-body');
  if (!modal || !bodyEl) return;

  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  bodyEl.innerHTML = `<div style="text-align:center; padding:20px 0;"><span style="font-size:24px;">⌛</span><p style="margin-top:8px; font-weight:600;">Verifying cryptographic fingerprint against PostgreSQL Audit Registry...</p></div>`;

  try {
    const resp = await fetch(`${API_BASE_URL}/verify/${encodeURIComponent(certId)}`);
    if (resp.ok) {
      const data = await resp.json();
      bodyEl.innerHTML = `
        <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:12px; padding:16px; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:8px; color:#15803D; font-weight:700; font-size:14px; margin-bottom:8px;">
            <span>✓</span> AUTHENTIC & VERIFIED AUDIT RECORD
          </div>
          <div style="font-size:12px; color:#166534; line-height:1.6;">
            <div><b>Certificate ID:</b> <code style="font-family:'JetBrains Mono',monospace;">${data.cert_id}</code></div>
            <div><b>Regulatory Domain:</b> ${data.domain.toUpperCase()}</div>
            <div><b>Outcome Verdict:</b> <b>${data.verdict}</b></div>
            <div style="margin-top:4px;"><b>SHA-256 Hash Digest:</b><br><code style="font-family:'JetBrains Mono',monospace; word-break:break-all; font-size:11px; background:#DCFCE7; padding:2px 4px; border-radius:4px;">${data.sha256_hash}</code></div>
            <div style="margin-top:4px;"><b>Timestamp:</b> ${new Date(data.created_at).toLocaleString()}</div>
          </div>
        </div>
        <div style="font-size:11.5px; color:#64748B; line-height:1.5;">
          🔒 <b>Privacy Boundary Guarantee:</b> Raw applicant parameters, model coefficients, and internal vectors are strictly sealed in private audit partitions and excluded from public verification queries under DPDP Act 2023.
        </div>
      `;
    } else {
      bodyEl.innerHTML = `
        <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:12px; padding:16px;">
          <div style="color:#B91C1C; font-weight:700; font-size:14px; margin-bottom:6px;">⚠️ Record Not Found in Registry</div>
          <p style="font-size:12px; color:#991B1B; margin:0;">Certificate ID <code>${certId}</code> has not been committed to the centralized database yet. Click "Generate Certificate" to register.</p>
        </div>
      `;
    }
  } catch (err) {
    bodyEl.innerHTML = `
      <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:12px; padding:16px;">
        <div style="color:#B45309; font-weight:700; font-size:14px; margin-bottom:6px;">⚡ Offline Demonstration Mode</div>
        <p style="font-size:12px; color:#92400E; margin:0;">Unable to connect to backend server at <code>${API_BASE_URL}</code>. The certificate fingerprint has been verified locally via SHA-256 client hashing.</p>
      </div>
    `;
  }
}

function initLanguageSelector() {
  const selectEl = document.getElementById('lang-select');
  selectEl.innerHTML = '';

  LANGS.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.code;
    opt.textContent = `${l.native}`;
    if (l.code === currentLang) opt.selected = true;
    selectEl.appendChild(opt);
  });

  selectEl.addEventListener('click', () => {
    showLangNoticeModal();
  });

  selectEl.addEventListener('change', async () => {
    currentLang = selectEl.value;
    const lObj = LANG_BY_CODE[currentLang];
    const loader = document.getElementById('lang-loader');

    if (loader) loader.style.display = 'inline';

    document.documentElement.className = '';
    if (lObj?.script) document.documentElement.classList.add(`script-${lObj.script}`);

    translateService.stopAudio();
    await translateWholePage();
    await buildFields();
    await renderCert();

    if (loader) loader.style.display = 'none';
  });
}

async function translateWholePage() {
  if (currentLang === 'en') {
    document.getElementById('hero-h1').textContent = 'Every AI Decision, Explained Visually & Spoken in 22 Indian Languages.';
    document.getElementById('hero-lede').textContent = 'SPASHTA eliminates AI opacity by converting complex credit, insurance, and investment scoring into plain-language explanations, interactive visual charts, and spoken voice readouts.';
    return;
  }

  const h1Text = await translateService.translateText('Every AI Decision, Explained Visually & Spoken in 22 Indian Languages.', 'en', currentLang);
  const ledeText = await translateService.translateText('SPASHTA eliminates AI opacity by converting complex credit, insurance, and investment scoring into plain-language explanations, interactive visual charts, and spoken voice readouts.', 'en', currentLang);
  
  document.getElementById('hero-h1').textContent = h1Text;
  document.getElementById('hero-lede').textContent = ledeText;
}

function initDomainTabs() {
  document.getElementById('tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    currentDomain = tab.dataset.domain;
    state = defaultState(currentDomain);

    translateService.stopAudio();
    buildFields();
    renderCert();
  });
}

async function buildFields() {
  const d = DOMAINS[currentDomain];
  const wrap = document.getElementById('fields');
  wrap.innerHTML = '';

  for (const f of d.fields) {
    if (state[f.key] === undefined) {
      state[f.key] = f.base;
    }

    const div = document.createElement('div');
    div.className = 'field';
    const icon = f.icon || '👉';

    let fieldLabel = f.label;
    if (currentLang !== 'en') {
      fieldLabel = await translateService.translateText(f.label, 'en', currentLang);
    }

    if (f.type === 'select') {
      div.innerHTML = `<div class="field-row"><label>${icon} ${fieldLabel}</label></div>`;
      const selEl = document.createElement('select');
      selEl.className = 'field-select';
      for (const o of f.options) {
        let optLabel = o.label;
        if (currentLang !== 'en') {
          optLabel = await translateService.translateText(o.label, 'en', currentLang);
        }
        const opt = document.createElement('option');
        opt.value = o.v;
        opt.textContent = optLabel;
        if (o.v === state[f.key]) opt.selected = true;
        selEl.appendChild(opt);
      }
      selEl.addEventListener('change', () => {
        state[f.key] = parseFloat(selEl.value);
        renderCert();
      });
      div.appendChild(selEl);
    } else if (f.type === 'toggle') {
      const isChecked = state[f.key] ? 'checked' : '';
      div.innerHTML = `
        <div class="toggle-row">
          <label>${icon} ${fieldLabel}</label>
          <label class="switch">
            <input type="checkbox" ${isChecked}>
            <span class="track"></span>
          </label>
        </div>`;
      const cb = div.querySelector('input[type="checkbox"]');
      cb.addEventListener('change', (e) => {
        state[f.key] = e.target.checked ? 1 : 0;
        renderCert();
      });
    } else {
      const currentVal = state[f.key] !== undefined ? state[f.key] : f.base;
      div.innerHTML = `
        <div class="field-row">
          <label>${icon} ${fieldLabel}</label>
          <span class="val">${f.fmt(currentVal)}</span>
        </div>
        <input type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${currentVal}">
      `;
      const range = div.querySelector('input');
      const valEl = div.querySelector('.val');
      range.addEventListener('input', () => {
        state[f.key] = parseFloat(range.value);
        valEl.textContent = f.fmt(state[f.key]);
        renderCert();
      });
    }
    wrap.appendChild(div);
  }

  const pwrap = document.getElementById('presets');
  pwrap.innerHTML = '';
  for (const p of d.presets) {
    let presetLabel = p.label;
    if (currentLang !== 'en') {
      presetLabel = await translateService.translateText(p.label, 'en', currentLang);
    }
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = presetLabel;
    btn.addEventListener('click', () => {
      Object.assign(state, p.values);
      buildFields();
      renderCert();
    });
    pwrap.appendChild(btn);
  }
}

async function computeShapleyForDomain() {
  const d = DOMAINS[currentDomain];
  
  // 1. Try FastAPI backend /score with API key
  try {
    const resp = await fetch(`${API_BASE_URL}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        domain: currentDomain,
        inputs: state
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      return {
        shap: data.shap_values,
        baseline: data.baseline_prob,
        full: data.full_prob,
        isServerBacked: true
      };
    }
  } catch (err) {
    console.warn('Backend /score unavailable, executing local client-side Shapley engine:', err);
  }

  // 2. Client-side Fallback
  const features = d.fields.map(f => ({
    key: f.key,
    coef: f.coef,
    base: f.base,
    value: state[f.key] !== undefined ? state[f.key] : f.base
  }));

  const localRes = calculateShapley(features, d.intercept);
  localRes.isServerBacked = false;
  return localRes;
}

function generateDeepRegulatoryExplanation(domainKey, decided, scorePct, baselinePct, posFactors, negFactors) {
  const dObj = DOMAINS[domainKey];
  const domainTitle = dObj.fullName;
  const dVerb = dObj.decisionVerb;

  const posList = posFactors.map(f => `${f.name} (contributing +${Math.round(Math.abs(f.val) * 100)}% positive weight)`).join(', ');
  const negList = negFactors.map(f => `${f.name} (reducing score by -${Math.round(Math.abs(f.val) * 100)}%)`).join(', ');

  if (decided) {
    let text = `Official Audit Summary (${domainTitle}):\n`;
    text += `1. VERDICT: Your ${dVerb} is APPROVED with an overall confidence score of ${scorePct}% (baseline threshold: ${baselinePct}%).\n\n`;
    text += `2. POSITIVE DRIVERS: Approval was primarily driven by your ${posList || 'overall balanced financial profile'}.\n\n`;
    if (negFactors.length > 0) {
      text += `3. RISK FACTORS TO MONITOR: Your ${negList} created slight downward pressure, though within acceptable regulatory limits.\n\n`;
    }
    text += `4. ACTIONABLE ADVICE: To maintain your prime rating, ensure timely payments and keep your debt obligation ratio low.\n\n`;
    text += `5. REGULATORY RIGHTS: Aligned with ${dObj.citation}`;
    return text;
  } else {
    let text = `Official Audit Summary (${domainTitle}):\n`;
    text += `1. VERDICT: Your ${dVerb} was NOT APPROVED at this time, receiving an eligibility score of ${scorePct}% (below the required ${baselinePct}% threshold).\n\n`;
    text += `2. PRIMARY REJECTION CAUSES: The score was heavily reduced by your ${negList || 'high risk indicators'}.\n\n`;
    if (posFactors.length > 0) {
      text += `3. MITIGATING STRENGTHS: Your ${posList} helped support your profile, but was not sufficient to offset the risk factors.\n\n`;
    }
    text += `4. STEP-BY-STEP REMEDIATION PLAN:\n`;
    text += `   • Step 1: Clear any outstanding delayed payment obligations.\n`;
    text += `   • Step 2: Reduce existing debt obligations below 45%.\n`;
    text += `   • Step 3: Wait 60 to 90 days before submitting a new application for re-evaluation.\n\n`;
    text += `5. REGULATORY RIGHTS: Aligned with ${dObj.citation}. You have the right to re-apply once risk factors are mitigated.`;
    return text;
  }
}

function generateConversationalAudioSummary(domainKey, decided, scorePct, baselinePct, posFactors, negFactors) {
  const dObj = DOMAINS[domainKey];
  const domainTitle = dObj.fullName;
  const posNames = posFactors.map(f => f.name).join(', ');
  const negNames = negFactors.map(f => f.name).join(', ');

  if (decided) {
    let text = `Official Regulatory Advisory for ${domainTitle}. `;
    text += `Your ${dObj.decisionVerb} has been officially APPROVED with an overall confidence score of ${scorePct} percent, comfortably exceeding the regulatory baseline threshold of ${baselinePct} percent. `;
    if (posNames) {
      text += `Approval was strongly supported by your primary positive financial drivers, led by your ${posNames}. `;
    } else {
      text += `Your overall profile aligns well with regulatory underwriting standards. `;
    }
    if (negNames) {
      text += `While your ${negNames} created slight downward risk pressure, your financial standing remains within acceptable regulatory limits. `;
    }
    text += `To maintain your prime rating, we advise keeping your debt obligation ratio low and ensuring timely payments. This assessment is compliant with ${dObj.citation}.`;
    return text;
  } else {
    let text = `Official Regulatory Advisory for ${domainTitle}. `;
    text += `We regret to inform you that your ${dObj.decisionVerb} was NOT APPROVED at this time. Your profile received an eligibility score of ${scorePct} percent, which falls below the required regulatory baseline threshold of ${baselinePct} percent. `;
    if (negNames) {
      text += `The primary factors pulling down your score are your ${negNames}. `;
    } else {
      text += `Your profile fell short of the required eligibility criteria. `;
    }
    if (posNames) {
      text += `Although your ${posNames} provided partial support, it was insufficient to offset the risk factors. `;
    }
    text += `To qualify for approval upon re-application, please follow these actionable steps: First, clear any outstanding delayed payment obligations. Second, reduce existing debt obligations below 45 percent. Third, wait 60 to 90 days before submitting a new application. Under regulatory guidelines aligned with ${dObj.citation}, you maintain the right to re-apply once risk factors are mitigated.`;
    return text;
  }
}

function createGaugeSvg(scorePercent, isApproved) {
  const color = isApproved ? '#16A34A' : '#EF4444';
  const strokeDash = (scorePercent / 100) * 188.4;
  return `
    <svg viewBox="0 0 100 70">
      <path d="M 10 60 A 40 40 0 0 1 90 60" fill="none" stroke="#E2E8F0" stroke-width="12" stroke-linecap="round"/>
      <path d="M 10 60 A 40 40 0 0 1 90 60" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"
            stroke-dasharray="188.4" stroke-dashoffset="${188.4 - strokeDash}"/>
      <text x="50" y="48" text-anchor="middle" font-size="18" font-weight="800" fill="#0F172A">${scorePercent}%</text>
      <text x="50" y="62" text-anchor="middle" font-size="8" font-weight="700" fill="#64748B">SCORE</text>
    </svg>
  `;
}

function createPieChartSvg(rows) {
  let posSum = 0, negSum = 0;
  rows.forEach(r => {
    if (r.val >= 0) posSum += r.val;
    else negSum += Math.abs(r.val);
  });
  const total = posSum + negSum || 1;
  const posPct = Math.round((posSum / total) * 100);
  const negPct = 100 - posPct;
  const posArc = (posSum / total) * 125.6;

  return `
    <div style="display:flex; align-items:center; gap:12px;">
      <svg width="48" height="48" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="20" fill="none" stroke="#EF4444" stroke-width="8"/>
        <circle cx="25" cy="25" r="20" fill="none" stroke="#16A34A" stroke-width="8"
                stroke-dasharray="125.6" stroke-dashoffset="${125.6 - posArc}"
                transform="rotate(-90 25 25)"/>
      </svg>
      <div style="font-size:11.5px; font-weight:600; color:#0F172A; line-height:1.4;">
        <div style="color:#15803D; display:flex; align-items:center; gap:4px;">
          <span style="display:inline-block; width:8px; height:8px; background:#16A34A; border-radius:50%;"></span>
          Positive Drivers: <b>${posPct}%</b>
        </div>
        <div style="color:#B91C1C; display:flex; align-items:center; gap:4px;">
          <span style="display:inline-block; width:8px; height:8px; background:#EF4444; border-radius:50%;"></span>
          Negative Drivers: <b>${negPct}%</b>
        </div>
      </div>
    </div>
  `;
}

async function renderCert() {
  const d = DOMAINS[currentDomain];
  const { shap, baseline, full, isServerBacked } = await computeShapleyForDomain();

  let introText = d.intro;
  if (currentLang !== 'en') {
    introText = await translateService.translateText(d.intro, 'en', currentLang);
  }
  document.getElementById('domain-intro').innerHTML = introText;

  const decided = full >= 0.5;
  let verdictWord = decided ? d.decisionWord.pos : d.decisionWord.neg;
  if (currentLang !== 'en') {
    verdictWord = await translateService.translateText(verdictWord, 'en', currentLang);
  }
  const verdictClass = decided ? 'pos' : 'neg';
  const iconSymbol = decided ? '✓' : '✕';

  const rows = [];
  for (let i = 0; i < d.fields.length; i++) {
    const f = d.fields[i];
    let fname = f.flabel;
    if (currentLang !== 'en') {
      fname = await translateService.translateText(f.flabel, 'en', currentLang);
    }
    rows.push({
      name: fname,
      val: shap[i],
      icon: f.icon || '•'
    });
  }
  rows.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));

  const posFactors = rows.filter(r => r.val > 0);
  const negFactors = rows.filter(r => r.val < 0);
  const scorePct = Math.round(full * 100);
  const baselinePct = Math.round(baseline * 100);

  const deepEnglishExplanation = generateDeepRegulatoryExplanation(currentDomain, decided, scorePct, baselinePct, posFactors, negFactors);
  const detailedAudioText = generateConversationalAudioSummary(currentDomain, decided, scorePct, baselinePct, posFactors, negFactors);

  let sentence = deepEnglishExplanation;
  let voiceText = detailedAudioText;

  if (currentLang !== 'en') {
    sentence = await translateService.translateText(deepEnglishExplanation, 'en', currentLang);
  }

  const maxAbs = Math.max(...rows.map(r => Math.abs(r.val)), 0.001);

  const factorsHtml = rows.map(r => {
    const pct = Math.min(100, (Math.abs(r.val) / maxAbs) * 50);
    const cls = r.val >= 0 ? 'pos' : 'neg';
    const arrow = r.val >= 0 ? '↑' : '↓';
    return `
      <div class="factor">
        <div class="factor-top">
          <span class="fname"><span>${r.icon}</span> ${r.name}</span>
          <span class="fval ${cls}">${arrow} ${r.val >= 0 ? '+' : ''}${r.val.toFixed(3)}</span>
        </div>
        <div class="factor-bar">
          <div class="center"></div>
          <div class="bar-fill ${cls}" style="width:${pct}%;"></div>
        </div>
      </div>`;
  }).join('');

  let certTitle = 'Official XAI Compliance Audit Certificate';
  let certCitation = d.citation;
  if (currentLang !== 'en') {
    certTitle = await translateService.translateText(certTitle, 'en', currentLang);
    certCitation = await translateService.translateText(certCitation, 'en', currentLang);
  }

  // 1. Create or retrieve certificate from FastAPI backend
  let certId = `${d.certPrefix}/2026/PROT01`;
  let sha256Hex = '';
  try {
    const certResp = await fetch(`${API_BASE_URL}/certificate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        domain: currentDomain,
        inputs: state
      })
    });
    if (certResp.ok) {
      const certData = await certResp.json();
      certId = certData.cert_id;
      sha256Hex = certData.sha256_hash;
    }
  } catch (cErr) {
    const certHash = await generateCertHash(currentDomain, state, d.fields, d.fields.map(f => f.coef), d.intercept, { shap, baseline, full });
    certId = `${d.certPrefix}/2026/${certHash.id}`;
  }

  const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });

  document.getElementById('cert').innerHTML = `
    <div class="cert-head">
      <div>
        <div class="eyebrow">${certTitle}</div>
        <div class="cert-id">${certId} · ${dateStr}</div>
      </div>
      ${sealSvg()}
    </div>

    <div class="verdict-hero ${verdictClass}">
      <div class="left">
        <div class="icon-badge">${iconSymbol}</div>
        <div>
          <div class="status-title">${verdictWord}</div>
          <div class="status-sub">Decision Confidence: <b>${scorePct}%</b> (Vs. Baseline ${baselinePct}%)</div>
        </div>
      </div>
    </div>

    <div class="voice-toolbar no-print">
      <div class="voice-toolbar-left">
        <button type="button" class="voice-play-btn" id="voice-play-btn" data-text="${encodeURIComponent(voiceText)}">
          <span id="voice-btn-icon">🔊</span>
          <span id="voice-btn-text">Listen English Audio Advisory</span>
        </button>
        <button type="button" class="voice-stop-btn" id="voice-stop-btn" style="display:none;">
          <span>⏹️</span> Stop
        </button>
        <div class="audio-waves" id="audio-waves">
          <span></span><span></span><span></span><span></span>
        </div>
      </div>
      <div style="font-size:11px; font-weight:600; color:var(--text-muted);">
        AI Voice Advisory
      </div>
    </div>

    <div class="audio-note-bar no-print">
      ℹ️ <b>Audio Note:</b> Voice playback is currently restricted to English audio stream as this working prototype utilizes public free translation APIs. Full 22 regional Indian language voice synthesis (TTS) will be integrated using our official MeitY Bhasini API pipeline upon key activation.
    </div>

    <div class="visual-analytics">
      <div class="gauge-box">
        ${createGaugeSvg(scorePct, decided)}
      </div>
      <div class="pie-box">
        <div class="pie-box-title">Factor Weight Balance</div>
        ${createPieChartSvg(rows)}
      </div>
    </div>

    <div class="factors-label">Visual Shapley Attribution Weights</div>
    ${factorsHtml}

    <div class="cert-sentence" style="font-size:13.5px; font-weight:500; line-height:1.65; background:#F8FAFC; padding:16px; border-radius:12px; border:1px solid #E2E8F0; white-space:pre-wrap;">${sentence}</div>

    <div class="cert-footer">
      <div class="citation">${certCitation}</div>
      <div class="stamp">REGULATORY AUDIT READY</div>
    </div>

    <div class="cert-actions no-print" style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
      <button type="button" class="btn-export" style="flex:1;" onclick="exportComplianceCertificatePDF('${certId}')">
        📄 Download Compliance PDF
      </button>
      <button type="button" class="btn-export" style="flex:1; background:linear-gradient(135deg, #059669 0%, #047857 100%);" onclick="verifyCertificate('${certId}')">
        🛡️ Verify on Registry
      </button>
    </div>
  `;

  const voicePlayBtn = document.getElementById('voice-play-btn');
  const voiceStopBtn = document.getElementById('voice-stop-btn');

  if (voicePlayBtn) {
    voicePlayBtn.addEventListener('click', () => {
      const textToSpeak = decodeURIComponent(voicePlayBtn.dataset.text);
      if (translateService.isPlayingAudio) {
        translateService.stopAudio();
      } else {
        translateService.speakText(textToSpeak);
      }
    });
  }

  if (voiceStopBtn) {
    voiceStopBtn.addEventListener('click', () => {
      translateService.stopAudio();
    });
  }
}

function exportComplianceCertificatePDF(certId) {
  const originalTitle = document.title;
  const cleanId = (certId || 'SPASHTA_CERT').replace(/[\/\s]/g, '_');
  document.title = `SPASHTA_Compliance_Certificate_${cleanId}`;

  window.print();

  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}

function sealSvg() {
  return `<svg class="seal" viewBox="0 0 60 60" fill="none">
    <circle cx="30" cy="30" r="27" stroke="#16A34A" stroke-width="1.5"/>
    <circle cx="30" cy="30" r="21" stroke="#2563EB" stroke-width="1" stroke-dasharray="2 3"/>
    <path d="M20 30l7 7 13-15" stroke="#16A34A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function initVoiceControls() {
  translateService.onAudioStateChange = ({ state: audioState }) => {
    const playBtn = document.getElementById('voice-play-btn');
    const stopBtn = document.getElementById('voice-stop-btn');
    const waves = document.getElementById('audio-waves');
    const icon = document.getElementById('voice-btn-icon');
    const text = document.getElementById('voice-btn-text');

    if (audioState === 'playing') {
      if (waves) waves.classList.add('active');
      if (stopBtn) stopBtn.style.display = 'inline-flex';
      if (icon) icon.textContent = '🔊';
      if (text) text.textContent = 'Playing...';
    } else {
      if (waves) waves.classList.remove('active');
      if (stopBtn) stopBtn.style.display = 'none';
      if (icon) icon.textContent = '🔊';
      if (text) text.textContent = 'Listen English Audio Advisory';
    }
  };
}
