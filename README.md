# Seguimiento Docentes Brown — GitHub Pages + Google Apps Script

Esta versión **no usa Vercel**. La interfaz vive en GitHub Pages y Google Apps Script funciona como backend para la hoja `Pedidos`.

## IMPORTANTE: corregido el error de “La consulta tardó demasiado”

La versión anterior podía enviar la respuesta de Apps Script al iframe contenedor de Google en lugar de devolverla a GitHub Pages. Esta versión usa un puente `postMessage` al nivel superior y agrega reintentos cortos.

## 1. Reemplazar el código de Apps Script

1. Abrí el proyecto **Seguimiento Pedidos Docentes Brown** en Apps Script.
2. Reemplazá **todo** `Código.gs` por `apps-script/Code.gs` de este ZIP.
3. Guardá.
4. Si todavía no configuraste el seguimiento, colocá temporalmente tu contraseña en `adminPasswordToInstall`, ejecutá `configurarSeguimientoGitHub()` y después podés volver a dejar `CAMBIAR_ESTA_CONTRASENA` en el código.

## 2. MUY IMPORTANTE: actualizar la implementación web

Editar el archivo NO actualiza automáticamente una implementación versionada.

1. Apps Script → **Implementar → Administrar implementaciones**.
2. Abrí la implementación web con el ícono del lápiz.
3. En **Versión**, elegí **Nueva versión**.
4. Verificá:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
5. Presioná **Implementar**.
6. Conservá la URL que termina en `/exec`.

La URL configurada actualmente en `index.html` es:

`https://script.google.com/macros/s/AKfycbwxFgKbKyQabRToBTWanOXFqz2KRvkbRmTL2iuJHhKbf5MMPaU6krSXkBqMa1Cb1OurVw/exec`

Si Google te entrega una URL nueva, reemplazá el valor de `GAS_BRIDGE_URL` dentro de `index.html`.

## 3. Prueba obligatoria antes de GitHub

Abrí la URL `/exec` directamente en Chrome. Debe aparecer:

**Seguimiento Docentes Brown — Puente activo ✓**

Si aparece JSON, una pantalla vieja o pide iniciar sesión, la implementación no está actualizada o no está publicada para “Cualquier usuario”.

## 4. GitHub Pages

Subí a la raíz del repositorio:

- `index.html`
- `favicon.svg`
- `.nojekyll`

La carpeta `apps-script` puede quedar como copia de seguridad, pero **no participa del sitio**.

Después: GitHub → Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

## 5. Uso

Seguimiento público:

`https://TU-USUARIO.github.io/TU-REPO/?id=DB-...`

Administración:

`https://TU-USUARIO.github.io/TU-REPO/?admin=1`

Al guardar un estado, la app prepara el mensaje y abre WhatsApp Business; el envío sigue siendo manual.
