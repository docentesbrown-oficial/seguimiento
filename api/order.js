const { callGas, sendJson } = require('./_lib/gas');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Método no permitido.' });
  }

  try {
    const raw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const orderId = String(raw || '').trim().toUpperCase();

    if (!/^DB-\d{14}-[A-Z0-9]{5}$/.test(orderId)) {
      return sendJson(res, 400, { ok: false, error: 'ID de pedido inválido.' });
    }

    const order = await callGas('lookup', { orderId });
    if (!order) {
      return sendJson(res, 404, { ok: false, error: 'No encontramos ese pedido.' });
    }

    // Solo datos que el comprador puede ver. El celular y datos internos no salen de esta API.
    const safeOrder = {
      orderId: order.orderId,
      status: order.status,
      placedAt: order.placedAt,
      customerName: order.customerName,
      deliveryMethod: order.deliveryMethod,
      quantity: order.quantity,
      courseOption: order.courseOption,
      cover: order.cover,
      addons: order.addons,
      shirt: order.shirt,
      stationery: order.stationery,
      paymentMethod: order.paymentMethod,
      finalTotal: order.finalTotal,
      paidNow: order.paidNow,
      balance: order.balance
    };

    return sendJson(res, 200, { ok: true, data: safeOrder });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      ok: false,
      error: error.message || 'Error inesperado.'
    });
  }
};
