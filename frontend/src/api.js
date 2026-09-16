// Base URLs for each microservice. In the original single-HTML-file app
// these were hardcoded `http://localhost:800X` constants; here they're
// env-driven so the exact same frontend build works locally, against a
// mix of local + cloud services, or fully on Cloud Run — just by setting
// VITE_* env vars at build time (see .env.example).
export const TRIAGE_URL     = import.meta.env.VITE_TRIAGE_URL     || 'http://localhost:8001';
export const DOCGEN_URL     = import.meta.env.VITE_DOCGEN_URL     || 'http://localhost:8002';
export const CODEINTEL_URL  = import.meta.env.VITE_CODEINTEL_URL  || 'http://localhost:8003';
export const INDEXER_URL    = import.meta.env.VITE_INDEXER_URL    || 'http://localhost:8004';
export const ITSM_URL       = import.meta.env.VITE_ITSM_URL       || 'http://localhost:8005';
export const DOCS_URL       = import.meta.env.VITE_DOCS_URL       || 'http://localhost:8006';
export const DEBT_URL       = import.meta.env.VITE_DEBT_URL       || 'http://localhost:8007';

export const GRAFANA_URL       = import.meta.env.VITE_GRAFANA_URL || '';
export const NEO4J_BROWSER_URL = import.meta.env.VITE_NEO4J_BROWSER_URL || '';

async function asJson(r) {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(d.detail ? (typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail)) : (d.error || `HTTP ${r.status}`));
  }
  return d;
}

export function getJson(url, opts) {
  return fetch(url, opts).then(asJson);
}

export function postJson(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(asJson);
}

export function postForm(url, formData) {
  return fetch(url, { method: 'POST', body: formData }).then(asJson);
}
