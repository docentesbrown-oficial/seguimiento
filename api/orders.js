const { callGas, requireAdmin, sendJson } = require('./_lib/gas');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Método no permitido.' });
  }

  try {
    requireAdmin(req);
    const orders = await callGas('list');
    return sendJson(res, 200, { ok: true, data: orders });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      ok: false,
      error: error.message || 'Error inesperado.'
    });
  }
};
