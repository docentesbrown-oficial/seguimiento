/**
 * DOCENTES BROWN · Seguimiento de pedidos
 * Backend independiente para una interfaz alojada en GitHub Pages.
 *
 * IMPORTANTE:
 * - No depende de la tienda.
 * - No envía WhatsApp automáticamente.
 * - GitHub Pages muestra la interfaz; este Apps Script lee/escribe la hoja Pedidos.
 * - La contraseña de administración queda guardada en Script Properties, no en GitHub.
 */

const TRACKER_CONFIG = {
  spreadsheetId: '1WG93fHGhMZjHPCDXWtWmXxX360CxfmdpKvwutIxRiM8',
  sheetName: 'Pedidos',
  statusHeader: 'Estado del pedido',
  adminPasswordProperty: 'DB_TRACKER_ADMIN_PASSWORD',

  // SOLO PARA LA INSTALACIÓN INICIAL:
  // 1) reemplazá el texto de abajo por una contraseña fuerte;
  // 2) ejecutá configurarSeguimientoGitHub();
  // 3) después podés volver a dejar este valor como CAMBIAR_ESTA_CONTRASENA.
  adminPasswordToInstall: 'CAMBIAR_ESTA_CONTRASENA'
};

const TRACKER_VERSION = 'github-pages-bridge-v2';

const TRACKER_STATUSES = [
  'Pendiente de pago',
  'Listo para Imprimir',
  'Listo para Encuadernar',
  'Listo para Entregar'
];

/**
 * Ejecutar UNA VEZ desde el editor de Apps Script.
 * Crea/normaliza la columna Estado del pedido, agrega el desplegable
 * y guarda la contraseña de administración en Script Properties.
 */
function configurarSeguimientoGitHub() {
  if (
    !TRACKER_CONFIG.adminPasswordToInstall ||
    TRACKER_CONFIG.adminPasswordToInstall === 'CAMBIAR_ESTA_CONTRASENA'
  ) {
    throw new Error('Antes de ejecutar, cambiá adminPasswordToInstall por una contraseña fuerte.');
  }

  PropertiesService.getScriptProperties().setProperty(
    TRACKER_CONFIG.adminPasswordProperty,
    TRACKER_CONFIG.adminPasswordToInstall
  );

  const sheet = getTrackerSheet_();
  const statusColumn = ensureStatusColumn_(sheet);
  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const range = sheet.getRange(2, statusColumn, lastRow - 1, 1);
    const values = range.getValues().map(function(row) {
      const current = cleanText_(row[0]);
      return [TRACKER_STATUSES.indexOf(current) >= 0 ? current : TRACKER_STATUSES[0]];
    });
    range.setValues(values);
  }

  applyStatusValidation_(sheet, statusColumn);
  SpreadsheetApp.flush();
  return 'Seguimiento GitHub configurado correctamente.';
}

/**
 * Visitar la URL /exec en el navegador sirve como prueba rápida del puente.
 */
function doGet() {
  return HtmlService
    .createHtmlOutput(
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Docentes Brown · Seguimiento</title></head><body style="font-family:system-ui;padding:32px;color:#24496e">' +
      '<h2>Seguimiento Docentes Brown</h2><p>Puente activo ✓</p><p>Esta URL funciona como backend de la app publicada en GitHub Pages.</p>' +
      '</body></html>'
    )
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * GitHub Pages envía formularios POST a este endpoint dentro de un iframe oculto.
 * La respuesta vuelve al navegador mediante window.parent.postMessage().
 */
function doPost(e) {
  const requestId = cleanText_(e && e.parameter ? e.parameter.requestId : '');

  try {
    if (!e || !e.parameter) throw new Error('Solicitud vacía.');

    const action = cleanText_(e.parameter.action);

    if (action === 'ping') {
      return bridgeResponse_(requestId, {
        ok: true,
        data: { service: 'Seguimiento Docentes Brown', version: TRACKER_VERSION }
      });
    }

    if (action === 'lookup') {
      const orderId = cleanOrderId_(e.parameter.orderId);
      const order = findOrderById_(orderId);
      return bridgeResponse_(requestId, {
        ok: true,
        data: order ? publicOrder_(order) : null
      });
    }

    if (action === 'list') {
      validateAdminPassword_(e.parameter.adminPassword);
      return bridgeResponse_(requestId, {
        ok: true,
        data: listOrders_()
      });
    }

    if (action === 'updateStatus') {
      validateAdminPassword_(e.parameter.adminPassword);
      const order = updateOrderStatus_(
        cleanOrderId_(e.parameter.orderId),
        cleanText_(e.parameter.status)
      );
      return bridgeResponse_(requestId, {
        ok: true,
        data: order
      });
    }

    throw new Error('Acción no reconocida.');
  } catch (error) {
    return bridgeResponse_(requestId, {
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}

function listOrders_() {
  const sheet = getTrackerSheet_();
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2) return [];

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const firstRow = Math.max(2, lastRow - 999);
  const rows = sheet
    .getRange(firstRow, 1, lastRow - firstRow + 1, lastColumn)
    .getValues();

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

    const updatedLastColumn = sheet.getLastColumn();
    const updatedHeaders = sheet
      .getRange(1, 1, 1, updatedLastColumn)
      .getDisplayValues()[0];
    const row = sheet
      .getRange(rowNumber, 1, 1, updatedLastColumn)
      .getValues()[0];

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
    return cleanText_(value(header));
  };

  const amount = function(header) {
    const number = Number(value(header));
    return isFinite(number) ? number : 0;
  };

  const placed = value('Fecha y hora');
  const placedAt = placed instanceof Date
    ? placed.toISOString()
    : cleanText_(placed);

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

/**
 * La consulta pública NO devuelve celular ni número de fila.
 */
function publicOrder_(order) {
  return {
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
}

function validateAdminPassword_(candidate) {
  const expected = PropertiesService
    .getScriptProperties()
    .getProperty(TRACKER_CONFIG.adminPasswordProperty);

  if (!expected) {
    throw new Error('La contraseña de administración todavía no fue configurada en Apps Script.');
  }

  if (cleanText_(candidate) !== expected) {
    throw new Error('Contraseña incorrecta.');
  }
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

function cleanOrderId_(value) {
  const orderId = cleanText_(value).toUpperCase();
  if (!/^DB-\d{14}-[A-Z0-9]{5}$/.test(orderId)) {
    throw new Error('ID de pedido inválido.');
  }
  return orderId;
}

function cleanText_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

/**
 * Respuesta CORS-free para GitHub Pages.
 * El iframe recibe HTML, ejecuta el script y devuelve el resultado al padre.
 */
function bridgeResponse_(requestId, payload) {
  const message = {
    source: 'DB_TRACKER',
    requestId: requestId,
    payload: payload
  };

  const safeJson = JSON.stringify(message)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  // Apps Script puede envolver el HTML del web app en uno o más iframes.
  // Por eso no alcanza con window.parent: el mensaje podría quedar atrapado
  // en el contenedor de Google y nunca llegar a GitHub Pages.
  // Enviamos al top-level y también a los padres como fallback.
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
    '<script>(function(){' +
    'var m=' + safeJson + ';' +
    'function send(){' +
      'try{window.top.postMessage(m,"*");}catch(e){}' +
      'try{window.parent.postMessage(m,"*");}catch(e){}' +
      'try{if(window.parent&&window.parent.parent){window.parent.parent.postMessage(m,"*");}}catch(e){}' +
    '}' +
    'send();setTimeout(send,150);setTimeout(send,700);' +
    '})();<\/script>' +
    '</body></html>';

  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
