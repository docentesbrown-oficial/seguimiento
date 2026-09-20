# Seguimiento de Pedidos · Docentes Brown

Versión final para **GitHub Pages + Google Apps Script**. No usa Vercel y no depende de la app de la tienda.

## Qué hace

- El comprador consulta su pedido con su **ID**.
- Ve estado, fecha, datos del pedido, forma de entrega y pagos.
- El celular **no aparece en la vista pública**.
- El administrador entra con contraseña, busca pedidos y cambia el estado.
- Al guardar, la app prepara un mensaje y abre **WhatsApp Business** en el celular cuando es posible.
- **El mensaje no se envía solo:** el administrador revisa y toca Enviar.
- Los datos se leen y actualizan directamente en la pestaña **Pedidos** de Google Sheets.

Estados incluidos:

1. Pendiente de pago
2. Listo para Imprimir
3. Listo para Encuadernar
4. Listo para Entregar

---

# INSTALACIÓN

## 1. Google Apps Script

Usá el mismo proyecto de Apps Script que ya creaste para el seguimiento.

1. Abrí el proyecto en Apps Script.
2. Reemplazá TODO el contenido de `Código.gs` por el archivo:
   `apps-script/Code.gs`
3. En la parte superior buscá:

```javascript
adminPasswordToInstall: 'CAMBIAR_ESTA_CONTRASENA'
```

4. Reemplazá `CAMBIAR_ESTA_CONTRASENA` por una contraseña fuerte que vayas a usar para entrar al panel administrador.
5. Guardá.
6. En el selector de funciones elegí `configurarSeguimientoGitHub`.
7. Tocá **Ejecutar** y aceptá los permisos de Google si los pide.
8. Cuando termine correctamente, podés volver a dejar esa línea como `CAMBIAR_ESTA_CONTRASENA`: la contraseña real ya quedó guardada en **Script Properties**.

### Actualizar la implementación web

No crees otro proyecto.

1. Apps Script → **Implementar → Administrar implementaciones**.
2. Editá tu aplicación web actual.
3. Elegí **Nueva versión**.
4. Confirmá:
   - **Ejecutar como:** Yo.
   - **Quién tiene acceso:** Cualquier usuario.
5. Implementá.

La URL `/exec` debería seguir siendo la misma. Esta versión del `index.html` ya tiene configurada:

`https://script.google.com/macros/s/AKfycbwxFgKbKyQabRToBTWanOXFqz2KRvkbRmTL2iuJHhKbf5MMPaU6krSXkBqMa1Cb1OurVw/exec`

Podés abrir esa URL directamente. Si está bien implementada debería mostrar **“Puente activo ✓”**.

> Si Google te entrega otra URL `/exec`, editá `index.html` y reemplazá solamente el valor de `GAS_BRIDGE_URL`.

---

## 2. GitHub

Para un repositorio nuevo o para reemplazar el anterior, subí a la raíz:

- `index.html`
- `favicon.svg`
- `.nojekyll`
- `README.md`
- la carpeta `apps-script` puede quedar como respaldo del código del backend; GitHub Pages no la ejecuta.

**No necesitás** `api/`, `.env`, `vercel.json`, `package.json` ni ninguna variable de entorno.

---

## 3. Activar GitHub Pages

En GitHub:

1. Abrí el repositorio.
2. **Settings → Pages**.
3. En **Build and deployment** elegí `Deploy from a branch`.
4. Branch: `main`.
5. Folder: `/ (root)`.
6. Guardá.

GitHub mostrará una URL similar a:

`https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`

La app detecta automáticamente ese subdirectorio, así que los enlaces personales de seguimiento conservan correctamente el nombre del repositorio.

---

# USO

## Comprador

Puede entrar con un enlace como:

`https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/?id=DB-20260919194523-A4X92`

O entrar a la página y escribir el ID manualmente.

## Administración

Entrá a:

`https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/?admin=1`

Ingresá la contraseña configurada en Apps Script.

Desde ahí podés:

- buscar por nombre, celular, ID o estado;
- cambiar el estado;
- guardar el cambio en Google Sheets;
- preparar el WhatsApp;
- editar el texto antes de enviarlo;
- corregir el celular si fuera necesario;
- copiar el mensaje o el enlace;
- abrir WhatsApp Business.

---

# IMPORTANTE SOBRE WHATSAPP

No hay envío automático.

En Android la app intenta abrir específicamente **WhatsApp Business**. Si no puede, usa el enlace estándar de WhatsApp.

En iPhone/iPad una página web no puede elegir de forma confiable entre WhatsApp y WhatsApp Business; iOS abre la aplicación asociada al enlace de WhatsApp.

---

# SEGURIDAD

- La contraseña administrativa **no está en `index.html`** ni en GitHub.
- Se guarda en **Script Properties** de Apps Script.
- El navegador la envía por HTTPS solamente cuando el administrador consulta o modifica pedidos.
- La consulta pública por ID no devuelve la columna `Celular`.
- GitHub Pages no tiene acceso directo a la hoja de cálculo.
- No publiques una contraseña dentro de `index.html`.

---

## Si aparece `Unexpected token '<' ... is not valid JSON`

Eso correspondía a la versión anterior que esperaba un backend `/api` de Vercel. **Esta versión ya no usa `/api` ni intenta interpretar páginas HTML como JSON.**

