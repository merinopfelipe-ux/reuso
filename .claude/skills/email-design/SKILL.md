---
name: email-design
description: >
  Diseño y voz de todos los correos del sistema Calculadora de Reuso.
  Leer SIEMPRE antes de crear, modificar o agregar cualquier correo transaccional,
  ya sea via Resend (src/lib/email.ts) o Supabase Auth (Dashboard Email Templates).
---

# Diseño de correos - Calculadora de Reúso

**REGLA ABSOLUTA DE NOMBRE:** El producto se llama **Calculadora de Reúso**. Nunca escribir solo "Reúso" como nombre del producto en ningún correo, asunto, subtítulo ni texto visible.

---

## 1. Filosofía y voz

Los correos no son notificaciones frías de sistema. Son el momento en que la plataforma le habla directamente a una persona.

**Reglas de voz:**
- Imperativo directo para acciones: "Confirma", "Usa", "Revisa", "Ingresa"
- Segunda persona singular siempre: "tú", nunca "usted"
- Voz activa: sujeto + verbo + objeto. Nunca pasiva
- Sin tecnicismos: "código de 8 dígitos", no "OTP token"
- Sin palabras vacías: sin "estimado/a", sin "por medio de la presente"

**Prohibido en todo texto visible:**
- Punto y coma `;` — reemplazar con punto o coma
- Guión largo `—` — hace pesada la lectura. Reemplazar con punto seguido o punto aparte
- Mayúsculas sostenidas
- Link o mención a ningún correo de soporte (`hola@reuso.lurdes.co` u otro)

---

## 2. Estructura narrativa — OBLIGATORIA

Cada correo responde estas tres preguntas en orden:

| # | Pregunta | Ejemplo |
|---|----------|---------|
| 1 | ¿En qué paso estoy? | "Ingresaste tu correo y ya casi terminas." |
| 2 | ¿Qué debo hacer ahora? | "Ingresa este código en la pantalla de verificación:" |
| 3 | ¿Qué pasa después? | "En cuanto lo uses, tu cuenta queda lista." |

- El parámetro `cuerpo` responde las preguntas 1 y 3
- El `contenidoCentral` (código OTP o botón) responde la pregunta 2

---

## 3. Estructura visual

Orden obligatorio del cuerpo:
1. Saludo + párrafo narrativo
2. Contenido central (botón o código OTP)
3. "Un saludo, El equipo de la Calculadora de Reúso"
4. Bloque de alerta 🔔 — SIEMPRE al final, nunca antes del sign-off

---

## 4. Sistema de clases CSS

Todos los elementos tienen clase corta para el modo noche. **Nunca omitirlas.**

| Clase | Elemento | Función |
|-------|----------|---------|
| `.eo` | `body` + tabla exterior | Contenedor raíz. Fondo lo controla el cliente de correo del dispositivo. Nunca sobrescribir. |
| `.ec` | `<td>` del cuerpo | Card principal. Noche: `#525252` |
| `.eh` | `<td>` de la cabecera | Día: `#00827C`. Noche: pistacho `#D6F391`, texto `#474747` |
| `.eb` | `<a>` del botón | Día: `#00827C` + blanco. Noche: pistacho `#D6F391` + `#474747` |
| `.ef` | `<td>` del footer | Noche: `#474747` |
| `.ea` | `<table>` de la alerta | Fondo `#FFF8E6`. Noche: ámbar sutil |
| `.ek` | `<table>` del bloque OTP | Fondo `#F0F7F6`. Noche: verde sutil |
| `.et` | `<table>` de datos | Filas de información (tickets, notificaciones) |

---

## 5. Colores — modo día

Todo el texto del cuerpo va en **Negro Lurdes `#474747`** sin excepción.

| Elemento | Valor |
|----------|-------|
| Cabecera fondo | `#00827C` sólido (sin gradiente) |
| Cabecera texto principal | `#ffffff` |
| Cabecera subtítulo | `rgba(255,255,255,0.75)` |
| Botón fondo | `#00827C` |
| Botón texto | `#ffffff` |
| Card fondo | `#ffffff` |
| Todo texto del cuerpo | `#474747` |
| Bloque OTP fondo | `#F0F7F6` |
| Bloque OTP código | `#00827C`, 40px, peso 800, `letter-spacing:0.25em` |
| Alerta fondo | `#FFF8E6` |
| Alerta texto | `#474747` |
| Footer fondo | `#F5F5F5` |
| Footer texto | `#474747` |

---

## 6. Modo noche — CSS completo

El CSS de noche va SIEMPRE en el `<body>` como primer elemento hijo, NUNCA en `<head>`. Gmail elimina todos los `<style>` del `<head>` antes de renderizar.

El bloque siempre lleva **cuatro secciones en este orden**. Nunca omitir ninguna.

```css
<style type="text/css">
  /* 1. Señal de color-scheme para clientes modernos */
  :root {
    color-scheme: light dark;
    supported-color-schemes: light dark;
  }

  /* 2. iOS Data Detectors — neutraliza el estilo visual cuando iOS convierte
        texto en link de teléfono, fecha o dirección. El toque sigue siendo un
        link pero el usuario no ve el subrayado azul. */
  a[x-apple-data-detectors] {
    color: inherit !important;
    text-decoration: none !important;
    font-size: inherit !important;
    font-family: inherit !important;
    font-weight: inherit !important;
    line-height: inherit !important;
  }

  /* 3. Protección extra para links dentro del bloque OTP */
  .otp-text a {
    color: inherit !important;
    text-decoration: none !important;
  }

  /* 4. Apple Mail, Outlook iOS, Samsung Mail, Thunderbird */
  @media (prefers-color-scheme: dark) {
    .ec { background-color: #525252 !important; }
    .ec p, .ec td, .ec span, .ec li { color: #E0E0E0 !important; }
    .ec strong { color: #ffffff !important; }
    .ec a { color: #D6F391 !important; }
    .eh { background-color: #D6F391 !important; }
    .eh p { color: #474747 !important; }
    .eh p + p { color: rgba(71,71,71,0.65) !important; }
    a.eb { background-color: #D6F391 !important; color: #474747 !important; }
    .ef { background-color: #474747 !important; border-top: 1px solid rgba(255,255,255,0.08) !important; }
    .ef p, .ef a { color: #E0E0E0 !important; }
    .ea td { background-color: rgba(246,191,62,0.10) !important; }
    .ea p { color: #F6BF3E !important; }
    .ek td { background-color: rgba(214,243,145,0.10) !important; }
    .ek a, .ek span { color: #D6F391 !important; }
    .ek p { color: #E0E0E0 !important; }
    .et { background-color: rgba(214,243,145,0.08) !important; }
    .et td { color: #E0E0E0 !important; }
  }

  /* Secciones [data-ogsc] y [data-ogsb] idénticas (Gmail app y Outlook.com web) */
  [data-ogsc] .ec { ... }
  [data-ogsb] .ec { ... }
  /* Regla clave del OTP en estas secciones: .ek a, .ek span (no solo .ek span) */
</style>
```

**Compatibilidad de modo noche por cliente de correo:**

| Cliente | Mecanismo | Soporte |
|---------|-----------|---------|
| Apple Mail (macOS/iOS) | `@media (prefers-color-scheme: dark)` | Completo |
| Samsung Mail | `@media (prefers-color-scheme: dark)` | Completo |
| Thunderbird | `@media (prefers-color-scheme: dark)` | Completo |
| Outlook iOS/macOS | `@media (prefers-color-scheme: dark)` | Completo |
| Yahoo Mail | `@media (prefers-color-scheme: dark)` | Parcial |
| Gmail app (Android e iOS) | `[data-ogsc]` en body | Parcial |
| Outlook.com web | `[data-ogsb]` en body | Completo |
| **Gmail web (navegador)** | **Ninguno — limitación de plataforma** | **Sin solución** |
| Outlook Windows | Motor Word, sin soporte CSS | Sin solución |

**Gmail web no tiene solución:** Google elimina todo el CSS del email antes de renderizarlo y aplica su propio algoritmo. No existe ningún selector CSS que lo sobrescriba. No insistir.

Regla crítica de contraste: cuando el fondo es pistacho `#D6F391`, el texto siempre es `#474747`. Prohibido texto blanco sobre pistacho.

Por qué `a.eb` y no `.eb`: `.ec a` tiene especificidad (0,1,1) y `.eb` tiene (0,1,0). Con `!important` en ambas, gana la más específica. `a.eb` iguala la especificidad y al ir después en el CSS, gana.

---

## 7. Tipografía

Una sola fuente en todo el correo: `'Open Sans', Helvetica, Arial, sans-serif`

Declarada en el `<body>` y heredada por todos los elementos. Prohibido `font-family: monospace`, `'Courier New'` o cualquier otra fuente en bloques de código u OTP. Los códigos se distinguen por tamaño (40px), peso (800) y letter-spacing, no por la fuente.

---

## 8. emailPlantilla() — correos vía Resend

Ruta: `src/lib/email.ts`

```typescript
emailPlantilla({
  preheader: 'Texto corto visible en la bandeja antes de abrir (max 90 chars)',
  subtituloHeader: 'Subtítulo en la cabecera verde (2-5 palabras)',
  saludo: '¡Hola, Nombre! 👋',
  cuerpo: 'Párrafo narrativo en voz activa. Paso actual y qué sigue.',
  contenidoCentral: '/* HTML del bloque OTP o botón CTA */',
  alertaAccion: 'uses el código',
  mostrarAlerta: true,
})
```

Scripts de preview local:
```bash
node scripts/preview-emails.mjs       # 3 correos Resend: -dia.html y -noche.html
node scripts/supabase-templates.mjs   # 6 templates Supabase: día y noche
```

Siempre correr el script y revisar ambos modos antes de publicar.

---

## 9. Inventario completo

### Correos vía Resend (`src/lib/email.ts`)

| Función | Cuándo se envía | Destinatario |
|---------|----------------|--------------|
| `enviarInvitacion()` | Admin invita a un miembro del equipo | Email del invitado |
| `enviarNotificacionTicket()` | Se crea un ticket de soporte | `innovacion@lurdes.co` |

### Templates Supabase (Dashboard → Authentication → Email Templates)

Generados por `scripts/supabase-templates.mjs`. Archivos HTML en `.email-previews/supabase/`.

| Archivo | Template en Supabase | Asunto |
|---------|---------------------|--------|
| `1-confirmar-registro.html` | Confirm signup | `Confirma tu correo en la Calculadora de Reúso` |
| `2-invitacion-admin.html` | Invite User | `Te invitaron a la Calculadora de Reúso` |
| `3-magic-link.html` | Magic Link | `Tu enlace de acceso a la Calculadora de Reúso` |
| `4-cambio-correo.html` | Change Email Address | `Confirma tu nuevo correo en la Calculadora de Reúso` |
| `5-recuperar-contrasena.html` | Reset Password | `Restablece tu contraseña en la Calculadora de Reúso` |
| `6-reautenticacion.html` | Reauthentication | `Tu código de verificación en la Calculadora de Reúso` |

Variables Supabase disponibles:
- `{{ .ConfirmationURL }}` enlace de confirmación
- `{{ .Token }}` código OTP (8 dígitos en recovery y reauth)
- `{{ .Email }}` correo del usuario
- `{{ .NewEmail }}` nuevo correo (solo en change email)

Cómo pegar en Supabase: Dashboard → Authentication → Email Templates → selecciona el template → pega el HTML completo en "Body" → pega el asunto en "Subject" → Save.

---

## 10. Asuntos — reglas

- Sin emojis, sin punto y coma, sin guión largo
- Voz activa: "Confirma tu correo", "Tu código para..."
- Mencionar "Calculadora de Reúso" si da contexto necesario
- Entre 5 y 10 palabras

---

## 11. Bloque OTP — prevención de detección de teléfono en iOS

iOS analiza el texto del email y convierte cualquier secuencia de 7-10 dígitos en un link de teléfono. Esto ocurre aunque el correo tenga `<meta name="format-detection" content="telephone=no">` — iOS ignora ese meta para patrones que considera "obvios".

**Patrón correcto (probado y confirmado):**

```html
<!-- El span con clase otp-text permite que el CSS neutralice cualquier link
     que iOS añada automáticamente alrededor del código -->
<span class="otp-text" style="display:inline-block;font-size:40px;font-weight:800;
  color:#00827C;letter-spacing:0.18em;">3784&thinsp;2951</span>
```

El `&thinsp;` parte visualmente el código en dos grupos de 4, mejorando legibilidad.
Para Supabase templates: `{{ .Token }}` sin partir (la variable se resuelve en el servidor, no en JS).

**Lo que NO funciona:**
- `<meta name="format-detection" content="telephone=no">` — iOS lo ignora para números "obvios"
- `x-apple-data-detectors="false"` en `<span>` — solo funciona en `<a>`, no en span
- Grupos separados `3784 2951` con thin space — iOS sigue detectando como teléfono
- `<a href="https://...">` — funciona para iOS pero navega al sitio web al tocar

**Lo que sí funciona:**
- CSS `a[x-apple-data-detectors]` — cuando iOS añade el link, el CSS lo hace invisible (sin subrayado azul, sin cambio de color). El usuario ve texto normal.
- CSS `.otp-text a` — protección extra para links dentro del span OTP.

---

## 12. Checklist antes de publicar

- [ ] ¿Usa `emailPlantilla()` (Resend) o `plantilla()` (supabase-templates.mjs)?
- [ ] ¿CSS en `<body>` (primer hijo), NO en `<head>`?
- [ ] ¿CSS tiene las 4 secciones: `:root`, `a[x-apple-data-detectors]`, `.otp-text a`, `@media` + `[data-ogsc]` + `[data-ogsb]`?
- [ ] ¿Bloque OTP usa `<span class="otp-text">` con grupos de 4 separados por `&thinsp;`?
- [ ] ¿Todo el texto del cuerpo en `#474747`?
- [ ] ¿Cabecera con `class="eh"`, botón con `a.eb`, footer con `class="ef"`?
- [ ] ¿El bloque 🔔 va DESPUÉS del sign-off?
- [ ] ¿Sin mención a ningún correo de soporte?
- [ ] ¿Sin `;` ni `—` en ningún texto visible?
- [ ] ¿Sin mayúsculas sostenidas?
- [ ] ¿Fuente Open Sans en todo el correo, sin monospace?
- [ ] ¿Preview revisado en modo día Y modo noche?
