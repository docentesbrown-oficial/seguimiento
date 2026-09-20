const GAS_URL = process.env.GAS_TRACKER_URL;
const GAS_SECRET = process.env.GAS_TRACKER_SECRET;

function requireEnv() {
  if (!GAS_URL || !GAS_SECRET) {
    const error = new Error('Falta configurar GAS_TRACKER_URL o GAS_TRACKER_SECRET en Vercel.');
    error.statusCode = 500;
    throw error;
  }
}

async function callGas(action, extra = {}) {
  requireEnv();

  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: GAS_SECRET, action, ...extra }),
    redirect: 'follow',
    cache: 'no-store'
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    const err = new Error('El puente de Google respondió con un formato inesperado.');
    err.statusCode = 502;
    throw err;
  }

  if (!response.ok || !payload.ok) {
    const err = new Error(payload.error || `Error del puente (${response.status}).`);
    err.statusCode = response.ok ? 400 : 502;
    throw err;
  }

  return payload.data;
}

function requireAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    const error = new Error('Falta configurar ADMIN_PASSWORD en Vercel.');
    error.statusCode = 500;
    throw error;
  }

  const auth = String(req.headers.authorization || '');
  const candidate = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!candidate || candidate !== expected) {
    const error = new Error('Acceso no autorizado.');
    error.statusCode = 401;
    throw error;
  }
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(data));
}

module.exports = { callGas, requireAdmin, sendJson };
