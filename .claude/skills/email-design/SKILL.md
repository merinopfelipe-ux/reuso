---
name: email-design
description: >
  Diseño, arquitectura y voz de todos los correos del sistema Calculadora de Reúso.
  Leer SIEMPRE antes de crear, modificar o agregar cualquier correo transaccional,
  ya sea vía Resend (src/lib/email.ts) o Supabase Auth (Dashboard Email Templates).
---

# Diseño y Arquitectura de Correos — Calculadora de Reúso

Guía técnica y de diseño para todos los correos transaccionales, notificaciones y plantillas del sistema.

---

## 1. Reglas Absolutas del Sistema

1. **Nombre de marca:**
   El producto se llama **Calculadora de Reúso**. Prohibido escribir solo "Reúso" como nombre del producto en cualquier correo, asunto, subtítulo o texto visible.
2. **Cero referencias a sectores específicos (Regla Sector-Agnóstica):**
   Prohibido usar palabras como *"mobiliario"*, *"muebles"*, *"restauración"*, *"madera"* o categorías específicas en las plantillas o copys base. La Calculadora de Reúso atiende transversalmente cualquier industria; usa términos generales como *"activos"*, *"recursos"*, *"materiales"*, *"proyectos"* e *"impacto ambiental"*.
3. **Prohibido mayúsculas sostenidas:**
   No usar `text-transform: uppercase` ni escribir palabras completas en mayúsculas (ni en antetítulos, ni en botones ni en asuntos).
4. **Prohibido signos de puntuación pesados:**
   - Sin punto y coma `;` — reemplazar con punto seguido o coma.
   - Sin guión largo `—` — reemplazar con punto seguido o paréntesis liviano.
5. **Sin soporte vía mailto en textos:**
   No incluir correos de soporte directo (`hola@reuso.lurdes.co`, etc.) en el texto visible.
6. **Sin marca de agua inferior:**
   No colocar textos decorativos, marcas de agua partidas ni gráficos en el pie de página. El pie debe ser limpio, sobrio y centrado.

---

## 2. Paleta de Colores y Tokens

| Token | Hex | Uso en Correos |
|-------|-----|----------------|
| `BRAND` | `#00827C` | Verde Reúso: botones CTA principales, antetítulos limpios y enlaces destacados |
| `NEGRO` | `#111111` | Títulos principales (h1) y números destacados |
| `LURDES` | `#474747` | Párrafos, cuerpo de texto y firmas (Negro Lurdes) |
| `MUTED` | `#8F9E9B` | Textos legales del footer, enlaces secundarios e iconos sociales |
| `BG_PAGE` | `#F8FAFB` | Fondo exterior de la página del correo |
| `BG_MUY_AGUA` | `#E6F2F0` | Fondo del cajón / card principal |
| `BLANCO` | `#FFFFFF` | Fondo de cajas internas (cajas de código OTP, tablas de datos) |
| `DARK_CARD` | `#1B2624` | Modo noche: fondo del cajón principal |
| `DARK_BG` | `#121817` | Modo noche: fondo exterior |
| `DARK_INNER` | `#243330` | Modo noche: fondo de cajas internas |
| `DARK_ACCENT` | `#52D1C9` | Modo noche: acentos y antetítulos |

---

## 3. Jerarquía y Arquitectura Visual

El diseño se compone de tres zonas estructurales bien diferenciadas:

```
┌──────────────────────────────────────────────────────────┐
│                   [LOGO COMPLETO OFICIAL]                │  ← Centrado con holgura (32px abajo)
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Antetítulo en Verde Reúso (texto limpio)           │  │
│  │                                                    │  │
│  │ Título principal en Negro (#111111)                │  │
│  │ Párrafo narrativo en Negro Lurdes (#474747)        │  │
│  │                                                    │  │  ← EL CAJÓN (#E6F2F0)
│  │   ┌────────────────────────────────────────────┐   │  │    border-radius: 28px
│  │   │        Código OTP / Caja de datos          │   │  │    Texto a la izquierda
│  │   │               [CENTRADO]                   │   │  │    Sin líneas divisorias
│  │   └────────────────────────────────────────────┘   │  │    Cajas internas blancas
│  │                                                    │  │
│  │                 [ BOTÓN CTA ]                      │  │  ← Botón centrado (#00827C)
│  │                                                    │  │
│  │ Un saludo,                                         │  │
│  │ El equipo de la Calculadora de Reúso               │  │
│  │                                                    │  │
│  │ 🔔 ¿No realizaste esta solicitud?                  │  │  ← Alerta de seguridad (caja blanca)
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│              Aviso legal transaccional                   │
│               Términos   ·   Privacidad                  │  ← DEBAJO DEL CAJÓN
│                  [Iconos Redes Sociales]                 │    Todo bien centrado
│            Grupo MLP S.A.S. · Medellín, Colombia         │
└──────────────────────────────────────────────────────────┘
```

### 3.1 Cabecera (Header)
- **Logo completo:** Se usa la imagen vectorial oficial [`public/logo-completo.svg`](file:///Users/merinop/Documents/Automatizaciones/Reuso/public/logo-completo.svg) (o [`public/logo-completo.png`](file:///Users/merinop/Documents/Automatizaciones/Reuso/public/logo-completo.png) para clientes sin SVG), con ancho de `148px`.
- Enlazado a `https://calculadoradereuso.com`.
- **Centrado** con padding inferior de `32px`.

### 3.2 El Cajón (Card Principal)
- **Fondo:** `#E6F2F0` (tono *"muy agua"* de marca).
- **Esquinas redondeadas:** `border-radius: 28px`.
- **Espaciado interior:** `padding: 48px 44px 44px`.
- **Alineación:** **Texto adentro a la izquierda** (`text-align: left`).
- **Sin separadores:** Prohibidas las líneas de división `border-bottom` o `<hr>` dentro del cajón.

#### Elementos internos del cajón:
1. **Antetítulo (Eyebrow):**
   - Texto plano y limpio: `font-size: 13px`, `font-weight: 700`, color `#00827C`.
   - **Nunca botón, nunca píldora con fondo.**
2. **Título principal (h1):**
   - `font-size: 26px`, `font-weight: 800`, color `#111111`, `line-height: 1.25`, alineado a la izquierda.
3. **Párrafo introductorio:**
   - `font-size: 15px`, color `#474747`, `line-height: 1.75`, alineado a la izquierda.
4. **Cajas internas (Inner Boxes):**
   - Fondo blanco `#FFFFFF`, `border-radius: 18px`, `padding: 28px 24px`.
   - **El texto adentro de estas cajas va centrado**:
     - Códigos OTP: `font-size: 38px`, `font-weight: 800`, `letter-spacing: 0.22em`.
     - Subtexto de expiración: `font-size: 12px`, color `#8F9E9B`.
5. **Botón CTA:**
   - **Centrado** horizontalmente en la tabla.
   - Fondo `#00827C`, texto `#FFFFFF`, `border-radius: 100px`, padding `15px 42px`, `font-size: 15px`, `font-weight: 700`.
   - **Solo se renderiza si la comunicación requiere una acción concreta** (no incluir botones decorativos o sin propósito).
6. **Firma:**
   - `"Un saludo,"` y `"El equipo de la Calculadora de Reúso"`, alineado a la izquierda.
7. **Bloque de alerta de seguridad (🔔):**
   - Caja interna blanca `#FFFFFF`, `border-radius: 16px`, padding `18px 22px`, texto explicativo alineado a la izquierda.

### 3.3 Debajo del Cajón (Footer)
- **Alineación:** Todo centrado (`text-align: center`).
- **Aviso legal obligatorio para correos transaccionales:**
  > *"Recibiste este correo porque tienes una cuenta en la Calculadora de Reúso. No tiene fines promocionales ni de marketing."*
- **Enlaces legales:** Términos y Privacidad en color `#8F9E9B`, separados por puntos medios `·`.
- **Redes sociales oficiales:** Iconos SVG limpios y enlazados a:
  - LinkedIn: `https://www.linkedin.com/company/calculadora-de-reuso`
  - YouTube: `https://www.youtube.com/@calculadoradereuso`
  - Instagram: `https://www.instagram.com/calculadoradereuso`
- **Dirección legal:**
  > Grupo MLP S.A.S.<br>Medellín, Colombia · calculadoradereuso.com

---

## 4. Filosofía de Voz y Tono

- **Imperativo directo para acciones:** *"Confirma"*, *"Usa"*, *"Revisa"*, *"Ingresa"*.
- **Segunda persona singular:** *"tú"*, nunca *"usted"*.
- **Voz activa:** sujeto + verbo + objeto.
- **Sin tecnicismos:** *"código de 8 dígitos"* en vez de *"OTP token"*.
- **Estructura narrativa obligatoria en 3 pasos:**
  1. *¿En qué paso estoy?* (Ej: *"Has recibido una invitación para sumarte al equipo."*)
  2. *¿Qué debo hacer ahora?* (Ej: *"Haz clic en el botón para aceptar tu acceso:"*)
  3. *¿Qué pasa después?* (Ej: *"Podrás ingresar de inmediato y comenzar a gestionar proyectos."*)

---

## 5. Modo Noche y Compatibilidad de Clientes

El CSS de modo noche se inserta siempre como primer bloque dentro de `<head>` o al inicio de `<body>`:

```css
:root {
  color-scheme: light dark;
  supported-color-schemes: light dark;
}
@media (prefers-color-scheme: dark) {
  body, .email-body { background-color: #121817 !important; }
  .email-card { background-color: #1B2624 !important; }
  .email-card h1, .email-card strong { color: #FFFFFF !important; }
  .email-card p, .email-card td { color: #D1DCDA !important; }
  .email-card a { color: #52D1C9 !important; }
  .email-inner-box td { background-color: #243330 !important; }
  .email-inner-box span.otp-text { color: #52D1C9 !important; }
  .email-eyebrow { color: #52D1C9 !important; }
  a.email-btn { background-color: #00827C !important; color: #FFFFFF !important; }
  .email-footer p, .email-footer a { color: #8F9E9B !important; }
}
[data-ogsc] .email-card { background-color: #1B2624 !important; }
[data-ogsb] .email-card { background-color: #1B2624 !important; }
```

### Prevención de detección de teléfono en iOS
iOS detecta secuencias numéricas y las subraya como enlaces telefónicos. Para evitarlo:
1. Usar `<span class="otp-text">`.
2. Incluir la regla CSS `a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }`.
3. Incluir `.otp-text a { color: inherit !important; text-decoration: none !important; }`.

---

## 6. Inventario de Correos del Sistema

### 6.1 Correos vía Resend (`src/lib/email.ts`)
| Función | Propósito | Destinatario |
|---------|-----------|--------------|
| `enviarInvitacion()` | Invitar a un miembro a unirse a una empresa | Correo del invitado |
| `enviarNotificacionTicket()` | Notificación interna de nuevo ticket de soporte | Equipo de soporte/innovación |
| `emailPlantilla()` | Función constructora base del layout completo | Uso interno |

### 6.2 Templates de Supabase Auth (`scripts/supabase-templates.mjs`)
Generan los archivos en `.email-previews/supabase/` para configurar en el Supabase Dashboard:

| Archivo | Evento en Supabase | Asunto |
|---------|--------------------|--------|
| `1-confirmar-registro.html` | Confirm signup | `Confirma tu correo en la Calculadora de Reúso` |
| `2-invitacion-admin.html` | Invite user | `Te invitaron a la Calculadora de Reúso` |
| `3-magic-link.html` | Magic link | `Tu enlace de acceso a la Calculadora de Reúso` |
| `4-cambio-correo.html` | Change email | `Confirma tu nuevo correo en la Calculadora de Reúso` |
| `5-recuperar-contrasena.html` | Reset password | `Restablece tu contraseña en la Calculadora de Reúso` |
| `6-reautenticacion.html` | Reauthentication | `Tu código de verificación en la Calculadora de Reúso` |

---

## 7. Scripts de Preview y Testing Local

```bash
# Generar y validar previews de correos Resend (modo día y noche):
node scripts/preview-emails.mjs

# Generar los 6 templates de Supabase Auth (HTML listos para pegar en Dashboard):
node scripts/supabase-templates.mjs

# Enviar correo de prueba real vía Resend:
node scripts/test-emails.mjs tu-correo@ejemplo.com
```

---

## 8. Checklist Antes de Publicar Cambios en Correos

- [ ] ¿El producto se identifica como **Calculadora de Reúso** (nunca "Reúso" solo)?
- [ ] ¿El copy es **completamente sector-agnóstico** (sin menciones a muebles, madera o categorías)?
- [ ] ¿El fondo del cajón es **#E6F2F0** con esquinas de `28px`?
- [ ] ¿El texto dentro del cajón está **alineado a la izquierda**?
- [ ] ¿No contiene líneas divisorias internas?
- [ ] ¿Las cajas internas (OTP o datos) tienen fondo blanco **#FFFFFF** con texto centrado?
- [ ] ¿El antetítulo es **texto plano limpio en sentence case** (sin botón ni píldora)?
- [ ] ¿El botón CTA (si aplica) está **centrado** y en `#00827C`?
- [ ] ¿El footer está **centrado** y contiene los enlaces legales y redes oficiales?
- [ ] ¿Se eliminó cualquier marca de agua en el pie?
- [ ] ¿Sin punto y coma `;` ni guión largo `—`?
- [ ] ¿Se probó en modo claro y modo oscuro?
