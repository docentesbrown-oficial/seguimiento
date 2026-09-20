const { callGas, requireAdmin, sendJson } = require('./_lib/gas');

const ALLOWED = [
  'Pendiente de pago',
  'Listo para Imprimir',
  'Listo para Encuadernar',
  'Listo para Entregar'
];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Método no permitido.' });
  }

  try {
    requireAdmin(req);

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const orderId = String(body.orderId || '').trim().toUpperCase();
    const status = String(body.status || '').trim();

    if (!/^DB-\d{14}-[A-Z0-9]{5}$/.test(orderId)) {
      return sendJson(res, 400, { ok: false, error: 'ID de pedido inválido.' });
    }
    if (!ALLOWED.includes(status)) {
      return sendJson(res, 400, { ok: false, error: 'Estado inválido.' });
    }

    const order = await callGas('updateStatus', { orderId, status });
    return sendJson(res, 200, { ok: true, data: order });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      ok: false,
      error: error.message || 'Error inesperado.'
    });
  }
};
