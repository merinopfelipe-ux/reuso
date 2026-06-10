---
name: email-design
description: >
  Diseño y voz de todos los correos del sistema Calculadora de Reúso. Plantilla base emailBase() en src/lib/email.ts.
  Leer SIEMPRE antes de crear, modificar o agregar cualquier correo transaccional.
---

# Diseño de correos — Calculadora de Reúso

**REGLA ABSOLUTA DE NOMBRE:** El producto se llama **Calculadora de Reúso**. Nunca escribir solo "Reúso" como nombre del producto en ningún correo, asunto, subtítulo ni texto visible.
**Ley Madre de correos. Sin excepciones.**

---

## 1. Filosofía

Los correos de Reúso no son notificaciones frías de sistema. Son el momento en que la plataforma le habla directamente a una persona. Deben sentirse como un mensaje claro de un colega amable, no como una alerta automática.

| Correcto | Incorrecto |
|----------|-----------|
| "Confirma tu correo para empezar" | "Se ha enviado un correo de confirmación" |
| "Usa este código para crear tu contraseña" | "El token de recuperación ha sido generado" |
| "El administrador respondió a tu consulta" | "Hay una actualización en el ticket #123" |

**Reglas de voz:**
- **Imperativo directo** para acciones: "Confirma", "Usa", "Revisa", "Ingresa"
- **Segunda persona singular** siempre: "tú", nunca "usted" ni "los usuarios"
- **Voz activa**: sujeto + verbo + objeto. Nunca pasiva.
- **Sin tecnicismos**: "código de 6 dígitos", no "OTP token"
- **Sin palabras vacías**: sin "estimado/a", sin "por medio de la presente"

---

## 2. Estructura visual (obligatoria, sin variaciones)

```
┌─────────────────────────────────────────┐
│                                         │
│         Calculadora de Reúso           │  ← h1 verde #00827C, 24px, bold, centrado
│         Subtítulo descriptivo           │  ← p gris #888, 12px, centrado
│                                         │
│  Label 1     │  Valor 1                 │  ← tabla: label bold, valor normal
│  Label 2     │  Valor 2                 │
│                                         │
│ ▌  Descripción amigable en voz activa  │  ← caja con borde izquierdo #00827C
│                                         │
│ ─────────────────────────────────────── │
│              © Grupo MLP S.A.S.         │  ← footer gris 11px
└─────────────────────────────────────────┘
```

**Propiedades exactas:**
- Fuente: `'Open Sans', sans-serif` (solo texto, sin imágenes de logo)
- Ancho máximo: `560px`, centrado, fondo `#ffffff`
- Padding: `32px 24px`
- Título `<h1>`: `color:#00827C`, `font-size:24px`, `font-weight:700`, `margin:0`
- Subtítulo: `color:#888`, `font-size:12px`, `margin:6px 0 0`
- Tabla: labels `font-weight:700`, `width:110px`, valores normales, `font-size:14px`
- Caja descripción: `background:#f6faf9`, `border-left:3px solid #00827C`, `padding:16px 20px`, `border-radius:0 6px 6px 0`, `font-size:14px`, `color:#333`, `line-height:1.6`
- Separador `<hr>`: `border:none`, `border-top:1px solid #eee`, `margin:28px 0`
- Footer: `color:#aaa`, `font-size:11px`, `text-align:center`

**Prohibido en correos:**
- Imágenes o logos SVG/PNG embebidos
- Botones con fondo de color (#00827C) — el enlace va dentro de la tabla o la descripción
- Texto en MAYÚSCULAS SOSTENIDAS
- Colores de fondo en el `<body>` o contenedor principal
- Más de 3 filas en la tabla de datos
- Emojis

---

## 3. Función `emailBase()` — usar SIEMPRE

**Ruta:** `src/lib/email.ts`

```typescript
import { emailBase } from '@/lib/email'

emailBase({
  subtitulo: 'Descripción del tipo de correo',
  filas: [
    { label: 'Etiqueta', valor: 'Valor o HTML simple' },
  ],
  descripcion: 'Texto amigable en voz activa. Puede contener <a href="...">enlaces</a> y <strong>negritas</strong>.',
})
```

**Reglas de uso:**
- `subtitulo`: 2-4 palabras que describan el tipo de correo (no el asunto)
- `filas`: máximo 3. Solo los datos que el usuario necesita ver de un vistazo
- `descripcion`: 1-2 oraciones en voz activa. La acción que el usuario debe tomar o el hecho relevante

---

## 4. Correos del sistema — inventario completo

### 4a. Correos vía Resend (código `src/lib/email.ts`)

| Función | Cuándo se envía | Destinatario |
|---------|----------------|--------------|
| `enviarInvitacion()` | Admin invita a un miembro | Email invitado |
| `enviarNotificacionTicket()` | Se crea un ticket de soporte | `innovacion@lurdes.co` |
| `enviarRespuestaTicket()` | Admin responde un ticket | Usuario que creó el ticket |
| `enviarFirmaConfidencialidad()` | Usuario firma el acuerdo | Usuario + BCC a innovacion |

### 4b. Correos vía Supabase Auth (Dashboard → Authentication → Email Templates)

| Template | Cuándo se envía |
|----------|----------------|
| Confirm signup | Al registrarse (verificar correo) |
| Reset Password | Al pedir recuperar contraseña |
| Magic Link | Login sin contraseña (desactivado, pero debe tener template) |
| Change Email Address | Al cambiar el correo de la cuenta |
| Reauthentication | Al pedir verificación de identidad antes de operación sensible |
| Invite User | Invitación nativa de Supabase (no usada, pero debe tener template) |

---

## 5. Asuntos de correo — tono y formato

**Regla:** Asunto = verbo imperativo + contexto. Nunca empieces con "Notificación de..." ni el nombre del sistema.

**Reglas de asunto:**
- Sin guiones, sin emojis
- Voz activa o imperativo directo
- Mencionar "Calculadora de Reúso" solo si aporta contexto; no como muletilla al final
- Entre 5 y 10 palabras

| Correo | Asunto correcto | Asunto incorrecto |
|--------|----------------|-------------------|
| Confirmar registro | `Confirma tu correo para empezar` | `Verificación de cuenta — Calculadora de Reúso` |
| Recuperar contraseña | `Tu código para crear una nueva contraseña` | `Recuperación de contraseña — Reúso` |
| Invitación equipo | `[Empresa] te invitó a unirse a Calculadora de Reúso` | `Invitación de usuario — Reúso` |
| Ticket de soporte | `Nuevo ticket recibido [categoría]` | `Notificación de soporte — Reúso` |
| Respuesta ticket | `Respondieron tu consulta en Calculadora de Reúso` | `Actualización en ticket #123` |
| Firma confidencialidad | `Tu Acuerdo de Confidencialidad está firmado` | `Documento generado — Reúso` |
| Cambio de correo | `Confirma tu nuevo correo en Calculadora de Reúso` | `Cambio de email — Reúso` |

---

## 6. Checklist antes de enviar a producción cualquier correo

- [ ] ¿Usa `emailBase()` de `src/lib/email.ts`? (o sigue la misma estructura en Supabase)
- [ ] ¿El subtítulo es descriptivo y en 2-4 palabras?
- [ ] ¿La tabla tiene máximo 3 filas con los datos esenciales?
- [ ] ¿La descripción está en voz activa e imperativo?
- [ ] ¿El asunto empieza con verbo o contexto directo (sin "Notificación de...")?
- [ ] ¿No hay imágenes, botones con fondo de color ni MAYÚSCULAS?
- [ ] ¿Se probó en Gmail y en modo oscuro?
