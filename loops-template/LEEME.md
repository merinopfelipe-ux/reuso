# Plantilla de correo para Loops (seguimiento de evento)

`index.mjml` es la plantilla del correo de seguimiento que se envía a quien deja
sus datos en un evento. Está escrita en MJML y usa las variables de **Loops**
(`{firstName}`, `{evento}`, `{empresa}`, `{unsubscribe_link}`).

## No es un correo del sistema
El código de la plataforma no lee este archivo. Los correos que envía la propia
aplicación viven en `src/lib/email.ts` (Resend). Esta plantilla se carga a mano
en Loops, que es la herramienta de campañas.

Por eso "no se ve aplicada" en la plataforma: son dos caminos distintos.
- **Loops** (esta plantilla): campañas y seguimientos comerciales, con opción de
  cancelar la suscripción.
- **Resend** (`src/lib/email.ts`): correos que dispara la aplicación
  (invitaciones, tickets, confirmaciones), sin cancelación de suscripción
  porque son necesarios para usar el servicio.

## Cómo publicarla en Loops
1. Convertir el MJML a HTML: `npx mjml loops-template/index.mjml -o loops-template/index.html`
2. En Loops, crear la campaña y pegar el HTML generado.
3. Enviar una prueba a una cuenta propia y abrirla en Gmail y en el correo del
   celular, en modo día y en modo noche.

## Reglas que ya cumple
- Las imágenes usan direcciones completas (`https://calculadoradereuso.com/...`).
  Una ruta relativa sale rota en todos los lectores de correo.
- Modo noche contemplado con `prefers-color-scheme` y con `[data-ogsc]`, que es
  lo que usa Outlook.
- Texto oculto de vista previa al inicio, para controlar lo que muestra la
  bandeja de entrada.
- Nombre completo "Calculadora de Reúso", sin abreviar.
