/**
 * SPASHTA Frontend Configuration
 * In production on Vercel, set window.SPASHTA_API_URL to your deployed Render URL:
 * e.g., 'https://spashta-backend.onrender.com'
 */
window.SPASHTA_API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : 'https://spashta-backend.onrender.com';

window.SPASHTA_API_KEY = 'spashta-secret-key-2026';
