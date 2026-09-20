# Seguimiento de Pedidos — Docentes Brown

Aplicación **independiente de la tienda** para consultar y administrar el estado de los pedidos guardados en la hoja `Pedidos`.

## Qué hace

- El comprador entra con su ID y ve el estado y el detalle de su pedido.
- El administrador entra a `/admin`, busca por nombre, celular o ID y cambia el estado.
- Al guardar, la app prepara el mensaje de WhatsApp con nombre, ID, estado y enlace personal de seguimiento.
- En celular, puede abrir WhatsApp Business con el mensaje ya escrito. **La app nunca lo envía sola:** el administrador revisa y toca Enviar.
- El celular se usa solo en el panel administrativo. La API pública no lo devuelve.
- No importa ni modifica código de la tienda. La única relación es la hoja `Pedidos`, que funciona como fuente de datos.

## Estructura

```text
/
├── index.html                 # UI pública + panel administrador
├── api/
│   ├── _lib/gas.js           # conexión privada con Apps Script
│   ├── order.js              # consulta pública por ID
│   ├── orders.js             # listado privado del admin
│   └── status.js             # cambio privado de estado
├── apps-script/
│   └── Code.gs               # código del puente independiente de Google
├── .env.example
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

## 1. Apps Script

El archivo `apps-script/Code.gs` **no se ejecuta en Vercel**. Es la copia del puente que tiene que estar en tu proyecto independiente de Google Apps Script.

1. Abrí el proyecto `Seguimiento Pedidos Docentes Brown`.
2. Reemplazá `Código.gs` por el contenido de `apps-script/Code.gs`.
3. En **Configuración del proyecto → Propiedades del script** confirmá que exista `TRACKER_SECRET` con la misma clave técnica que ya venías usando.
4. Ejecutá `configurarSeguimiento()` una vez.
5. En **Implementar → Administrar implementaciones**, editá la aplicación web y generá una versión nueva.
6. Conservá la URL `/exec`.

Este código NO contiene WhatsApp automático, NO crea triggers de WhatsApp y NO envía mensajes.

## 2. GitHub

Subí **el contenido de esta carpeta** a un repositorio nuevo e independiente. No lo metas dentro del repositorio de la tienda.

## 3. Vercel

Importá ese repositorio en Vercel y agregá estas tres Environment Variables:

### `GAS_TRACKER_URL`

```text
https://script.google.com/macros/s/AKfycbwxFgKbKyQabRToBTWanOXFqz2KRvkbRmTL2iuJHhKbf5MMPaU6krSXkBqMa1Cb1OurVw/exec
```

### `GAS_TRACKER_SECRET`

La misma clave guardada como `TRACKER_SECRET` en Apps Script. **No la pongas en GitHub.**

### `ADMIN_PASSWORD`

Una contraseña larga que vas a usar para entrar a `/admin`. **No la pongas en GitHub.**

Después hacé Deploy.

## 4. Direcciones de la app

Si Vercel publica, por ejemplo:

```text
https://seguimiento-docentes-brown.vercel.app
```

entonces:

- Seguimiento público: `https://seguimiento-docentes-brown.vercel.app/pedido?id=DB-...`
- Administración: `https://seguimiento-docentes-brown.vercel.app/admin`

La propia app arma automáticamente el enlace de seguimiento correcto usando el dominio definitivo de Vercel.

## Flujo del administrador

1. Entrar a `/admin`.
2. Escribir `ADMIN_PASSWORD`.
3. Buscar un pedido.
4. Elegir el nuevo estado.
5. Tocar **Guardar**.
6. Se actualiza la hoja.
7. Se abre el editor del mensaje con el celular de la columna `Celular`.
8. Si está activado **Abrir WhatsApp al guardar**, en Android se intenta abrir WhatsApp Business directamente.
9. Revisar el mensaje y tocar **Enviar** en WhatsApp.

## Estados disponibles

- Pendiente de pago
- Listo para Imprimir
- Listo para Encuadernar
- Listo para Entregar

## Seguridad

- `GAS_TRACKER_SECRET` solo existe en Vercel y Apps Script; nunca llega al navegador.
- `ADMIN_PASSWORD` se valida en las funciones `/api/orders` y `/api/status`.
- La consulta pública `/api/order` no incluye el celular.
- `.env*` y `.vercel` están ignorados por Git.

## Nota sobre WhatsApp Business

En Android la app intenta abrir específicamente WhatsApp Business. Si el dispositivo o navegador no lo permite, usa `wa.me` como alternativa. En iPhone/iPad la web no puede forzar de manera fiable cuál de las apps de WhatsApp debe abrir; se utiliza el enlace oficial de WhatsApp.
