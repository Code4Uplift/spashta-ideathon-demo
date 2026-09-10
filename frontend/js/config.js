/**
 * SPASHTA Frontend Configuration
 * Points to the live Render FastAPI backend API in production.
 */
window.SPASHTA_API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8000'
  : 'https://spashta-ideathon-demo.onrender.com';

window.SPASHTA_API_KEY = 'spashta-secret-key-2026';
