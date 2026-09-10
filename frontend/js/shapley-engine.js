function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Feature attribution for a linear (logistic) scoring model, using the
 * Aumann-Shapley value — the continuous-game generalization of the
 * Shapley value (Aumann & Shapley, 1974), which is the formulation
 * underlying "Integrated Gradients" attribution in ML (Sundararajan
 * et al., 2017). It is what makes the earlier "exact Shapley" claim
 * defensible, because it satisfies the same axioms classic Shapley
 * values do — importantly, EFFICIENCY:
 *
 *      sum(phi_i) === f(x) - f(baseline)
 *
 * i.e. the attributions must add up exactly to the actual change in
 * outcome. That is the property a regulator/auditor will check first,
 * and it's the thing the previous implementation silently violated
 * (it used the derivative at the *midpoint* of baseline/full
 * probability as a stand-in for every feature's slope, which only
 * approximates the true integral and can be off by several percent —
 * worse for large swings).
 *
 * Because this model is linear in its inputs (z = intercept + sum(coef_i * x_i)),
 * the Aumann-Shapley integral has an exact closed form: the *secant*
 * slope of the sigmoid between baseline and full inputs, not the
 * *tangent* slope at their midpoint:
 *
 *      secantSlope = (fullProb - baselineProb) / deltaZ   [deltaZ = targetZ - baselineZ]
 *
 * Each feature's contribution to deltaZ (coef_i * (value_i - base_i))
 * is scaled by that single shared secantSlope. Because delta_i sums to
 * deltaZ by construction, and shap_i = delta_i * secantSlope, the sum
 * of shap_i telescopes to exactly (fullProb - baselineProb) — the
 * efficiency axiom holds for any input, not just small perturbations.
 */
function calculateShapley(features, intercept = 0) {
  let baselineZ = intercept;
  features.forEach(f => {
    baselineZ += f.coef * f.base;
  });
  const baselineProb = sigmoid(baselineZ);

  let targetZ = intercept;
  features.forEach(f => {
    targetZ += f.coef * f.value;
  });
  const fullProb = sigmoid(targetZ);

  const deltaZ = targetZ - baselineZ;

  // secantSlope = average rate of change of sigmoid along the
  // straight-line path from baseline to target in logit space.
  // As deltaZ -> 0 this converges to the tangent slope at baselineZ
  // (L'Hopital / definition of the derivative), so we use that as
  // the limit case instead of dividing by ~0.
  const EPS = 1e-9;
  const secantSlope = Math.abs(deltaZ) < EPS
    ? baselineProb * (1 - baselineProb)
    : (fullProb - baselineProb) / deltaZ;

  const shapleyValues = features.map(f => {
    const delta = f.coef * (f.value - f.base);
    return delta * secantSlope;
  });

  return {
    shap: shapleyValues,
    baseline: baselineProb,
    full: fullProb,
    deltaZ
  };
}

/**
 * Produces a tamper-evident certificate fingerprint using SHA-256 over
 * the exact decision inputs (domain, field values, model coefficients,
 * intercept, and the resulting attribution values). Any change to any
 * of those — a different applicant value, a tweaked coefficient, a
 * hand-edited attribution — produces a completely different hash, so
 * the hash can be recomputed and compared later to detect tampering.
 *
 * IMPORTANT — this is a *hash*, not a *signature*. A real digital
 * signature additionally proves WHO produced the certificate, using a
 * private key that never leaves a server/HSM (this is a static
 * client-side demo, so there is no private key to sign with). That is
 * intentionally called out as a Phase 1 roadmap item ("QR-Verified PDF
 * Compliance Certificates") rather than claimed as already done.
 * Do not describe this function's output as "cryptographically
 * signed" — say "cryptographic hash / tamper-evident ID".
 */
async function generateCertHash(domainKey, state, fields, coefficients, intercept, shapleyResult) {
  const payload = {
    domain: domainKey,
    intercept,
    inputs: fields.map(f => ({
      key: f.key,
      value: state[f.key] !== undefined ? state[f.key] : f.base,
      coef: f.coef,
      base: f.base
    })),
    baseline: shapleyResult.baseline,
    full: shapleyResult.full,
    shap: shapleyResult.shap
  };

  const json = JSON.stringify(payload);

  // crypto.subtle requires a "secure context" (https, or localhost);
  // it can be unavailable when the demo is opened directly as a
  // file:// URL in some browsers, per the README's "double-click
  // index.html" instructions. Fall back to a deterministic non-crypto
  // hash (FNV-1a) in that case so the demo still works offline — but
  // this is explicitly NOT cryptographic, so callers should not label
  // it as such when this path is taken.
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(json);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hex = Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return { id: hex.slice(0, 10).toUpperCase(), cryptographic: true };
  } catch (err) {
    let h = 0x811c9dc5;
    for (let i = 0; i < json.length; i++) {
      h ^= json.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return { id: (h >>> 0).toString(16).padStart(10, '0').toUpperCase(), cryptographic: false };
  }
}
