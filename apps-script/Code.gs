/**
 * DOCENTES BROWN — PUENTE DE SEGUIMIENTO DE PEDIDOS
 *
 * Proyecto independiente de la tienda.
 * - Lee pedidos existentes de la pestaña "Pedidos".
 * - Devuelve el celular SOLO a la API administrativa.
 * - Actualiza manualmente "Estado del pedido".
 * - NO envía WhatsApp ni crea triggers de WhatsApp.
 *
 * La propiedad TRACKER_SECRET debe existir en:
 * Configuración del proyecto -> Propiedades del script.
 */

const TRACKER_CONFIG = {
  spreadsheetId: '1WG93fHGhMZjHPCDXWtWmXxX360CxfmdpKvwutIxRiM8',
  sheetName: 'Pedidos',
  statusHeader: 'Estado del pedido',
  secretProperty: 'TRACKER_SECRET'
};

const TRACKER_STATUSES = [
  'Pendiente de pago',
  'Listo para Imprimir',
  'Listo para Encuadernar',
  'Listo para Entregar'
];

function configurarSeguimiento() {
  const secret = PropertiesService.getScriptProperties().getProperty(TRACKER_CONFIG.secretProperty);
  if (!secret) {
    throw new Error('Falta la propiedad TRACKER_SECRET en las Propiedades del script.');
  }

  const sheet = getTrackerSheet_();
  const statusColumn = ensureStatusColumn_(sheet);
  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const range = sheet.getRange(2, statusColumn, lastRow - 1, 1);
    const values = range.getValues().map(function(row) {
      const current = cleanTrackerText_(row[0]);
      return [TRACKER_STATUSES.indexOf(current) >= 0 ? current : TRACKER_STATUSES[0]];
    });
    range.setValues(values);
  }

  applyStatusValidation_(sheet, statusColumn);
  SpreadsheetApp.flush();
  return 'Seguimiento configurado correctamente.';
}

function doPost(e) {
  try {
    const payload = parseTrackerPayload_(e);
    validateTrackerSecret_(payload.secret);

    if (payload.action === 'lookup') {
      const order = findOrderById_(cleanOrderId_(payload.orderId));
      return trackerJson_({ ok: true, data: order });
    }

    if (payload.action === 'list') {
      return trackerJson_({ ok: true, data: listOrders_() });
    }

    if (payload.action === 'updateStatus') {
      const order = updateOrderStatus_(
        cleanOrderId_(payload.orderId),
        cleanTrackerText_(payload.status)
      );
      return trackerJson_({ ok: true, data: order });
    }

    throw new Error('Acción no reconocida.');
  } catch (error) {
    return trackerJson_({
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}

function doGet() {
  return trackerJson_({ ok: true, service: 'Seguimiento de pedidos Docentes Brown' });
}

function listOrders_() {
  const sheet = getTrackerSheet_();
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2) return [];

  // Máximo: últimos 1000 pedidos, del más nuevo al más viejo.
  const firstRow = Math.max(2, lastRow - 999);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const rows = sheet.getRange(firstRow, 1, lastRow - firstRow + 1, lastColumn).getValues();

  return rows
    .map(function(row, index) {
      return rowToOrder_(headers, row, firstRow + index);
    })
    .filter(function(order) {
      return Boolean(order.orderId);
    })
    .reverse();
}

function findOrderById_(orderId) {
  const sheet = getTrackerSheet_();
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const idColumn = headerIndex_(headers, 'ID de pedido') + 1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const match = sheet
    .getRange(2, idColumn, lastRow - 1, 1)
    .createTextFinder(orderId)
    .matchEntireCell(true)
    .matchCase(false)
    .findNext();

  if (!match) return null;
  const rowNumber = match.getRow();
  const row = sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  return rowToOrder_(headers, row, rowNumber);
}

function updateOrderStatus_(orderId, status) {
  if (TRACKER_STATUSES.indexOf(status) < 0) {
    throw new Error('Estado de pedido inválido.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const sheet = getTrackerSheet_();
    const statusColumn = ensureStatusColumn_(sheet);
    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
    const idColumn = headerIndex_(headers, 'ID de pedido') + 1;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error('No hay pedidos cargados.');

    const match = sheet
      .getRange(2, idColumn, lastRow - 1, 1)
      .createTextFinder(orderId)
      .matchEntireCell(true)
      .matchCase(false)
      .findNext();

    if (!match) throw new Error('No encontramos ese pedido.');

    const rowNumber = match.getRow();
    sheet.getRange(rowNumber, statusColumn).setValue(status);
    SpreadsheetApp.flush();

    const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    const row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
    return rowToOrder_(updatedHeaders, row, rowNumber);
  } finally {
    lock.releaseLock();
  }
}

function rowToOrder_(headers, row, rowNumber) {
  const value = function(header) {
    const index = headers.indexOf(header);
    return index >= 0 ? row[index] : '';
  };
  const text = function(header) {
    return cleanTrackerText_(value(header));
  };
  const amount = function(header) {
    const number = Number(value(header));
    return isFinite(number) ? number : 0;
  };

  const placed = value('Fecha y hora');
  const placedAt = placed instanceof Date ? placed.toISOString() : cleanTrackerText_(placed);

  const shirt = text('¿Agregó remera?').toLowerCase() === 'sí'
    ? [text('Modelo de remera'), text('Talle y color')].filter(Boolean).join(' · ')
    : '';

  const stationery = [
    text('Productos de librería'),
    text('Variante Kit Docentes 2026')
  ].filter(Boolean).join(' · ');

  const rawStatus = text(TRACKER_CONFIG.statusHeader);

  return {
    row: rowNumber,
    orderId: text('ID de pedido'),
    status: TRACKER_STATUSES.indexOf(rawStatus) >= 0 ? rawStatus : TRACKER_STATUSES[0],
    sourceState: text('Estado'),
    placedAt: placedAt,
    customerName: text('Nombre completo'),
    phone: text('Celular'),
    deliveryMethod: text('Método de entrega'),
    quantity: amount('Cantidad de calificadores'),
    courseOption: text('Opción de cursos'),
    cover: text('Tapa elegida'),
    addons: text('Agregados elegidos'),
    shirt: shirt,
    stationery: stationery,
    paymentMethod: text('Forma de pago'),
    finalTotal: amount('Total final'),
    paidNow: amount('Pago ahora'),
    balance: amount('Saldo al entregar')
  };
}

function ensureStatusColumn_(sheet) {
  const lastColumn = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  let index = headers.indexOf(TRACKER_CONFIG.statusHeader);

  if (index < 0) {
    index = lastColumn;
    sheet.getRange(1, index + 1).setValue(TRACKER_CONFIG.statusHeader);
    sheet.getRange(1, index + 1)
      .setFontWeight('bold')
      .setBackground('#24496e')
      .setFontColor('#ffffff');
  }

  applyStatusValidation_(sheet, index + 1);
  return index + 1;
}

function applyStatusValidation_(sheet, column) {
  const rows = Math.max(1, sheet.getMaxRows() - 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(TRACKER_STATUSES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, column, rows, 1).setDataValidation(rule);
}

function getTrackerSheet_() {
  const spreadsheet = SpreadsheetApp.openById(TRACKER_CONFIG.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(TRACKER_CONFIG.sheetName);
  if (!sheet) throw new Error('No existe la pestaña Pedidos.');
  return sheet;
}

function headerIndex_(headers, header) {
  const index = headers.indexOf(header);
  if (index < 0) throw new Error('Falta la columna obligatoria: ' + header);
  return index;
}

function parseTrackerPayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Solicitud vacía.');
  }
  return JSON.parse(e.postData.contents);
}

function validateTrackerSecret_(candidate) {
  const expected = PropertiesService
    .getScriptProperties()
    .getProperty(TRACKER_CONFIG.secretProperty);

  if (!expected || cleanTrackerText_(candidate) !== expected) {
    throw new Error('Acceso no autorizado.');
  }
}

function cleanOrderId_(value) {
  const orderId = cleanTrackerText_(value).toUpperCase();
  if (!/^DB-\d{14}-[A-Z0-9]{5}$/.test(orderId)) {
    throw new Error('ID de pedido inválido.');
  }
  return orderId;
}

function cleanTrackerText_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function trackerJson_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
