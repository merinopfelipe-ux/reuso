---
tags: [correos, tracking, analitica, métricas, aperturas, clics, superadmin, deliverability]
fecha: 2026-08-20
aliases: [seguimiento-correos, tracking-aperturas-correos, analitica-correos-admin]
---

# Trazabilidad, Aperturas y Métricas de Correos

## 1. Visión General
El sistema de **Correos y Comunicaciones del Superadministrador** incorpora un motor integral de medición y seguimiento en tiempo real para todos los despachos individuales, segmentados y masivos realizados en la plataforma.

Cada correo enviado genera un registro padre (`admin_correos_enviados`) y un registro individual por destinatario (`admin_correos_destinatarios`), permitiendo auditar la interacción exacta de cada usuario.

---

## 2. Métricas y KPIs Disponibles

En la vista de detalle y seguimiento ([`/admin/correos/[id]`](file:///Users/merinop/Documents/Automatizaciones/Reuso/src/app/(admin)/admin/correos/[id]/page.tsx)), se presentan 4 indicadores clave:

1. **Destinatarios Totales:** Volumen total de contactos a los que se intentó entregar el mensaje.
2. **Tasa de Apertura (Open Rate %):** Porcentaje de destinatarios únicos que abrieron el correo ($(\text{Abiertos} / \text{Total}) \times 100$) y conteo bruto de aperturas acumuladas.
3. **Tasa de Clics (CTR %):** Porcentaje de destinatarios que hicieron clic en al menos un enlace del correo ($(\text{Clics} / \text{Total}) \times 100$) y conteo bruto de interacciones.
4. **Tasa de Desuscripción:** Porcentaje de usuarios que hicieron clic en "cancelar suscripción" a partir de ese despacho específico.

---

## 3. Arquitectura Técnica de Medición

### A. Píxel de Apertura Invisible (Open Tracking Pixel)
- Al despachar cada correo, el motor `enviarCorreoAdmin` en `src/lib/email.ts` inserta un token criptográfico único (`track_token`) asociado al destinatario.
- Se inyecta un píxel transparente de 1x1:
  ```html
  <img src="https://reuso.lurdes.co/api/track/email/open?t=<TOKEN>" width="1" height="1" style="display:none;" alt="" />
  ```
- Al cargarse las imágenes en el cliente de correo (Gmail, Outlook, Apple Mail), el endpoint [`/api/track/email/open`](file:///Users/merinop/Documents/Automatizaciones/Reuso/src/app/api/track/email/open/route.ts):
  - Actualiza el estado a `abierto`.
  - Registra `primera_apertura_at` y `ultima_apertura_at`.
  - Incrementa `aperturas_count`.
  - Captura IP y User-Agent para fines de auditoría.
  - Responde con un GIF de 1x1 byte con cabeceras `Cache-Control: no-store, no-cache`.

### B. Medición de Clics (Link / Click Tracking)
- Los enlaces dentro del cuerpo del mensaje son procesados automáticamente para redirigir a través del endpoint [`/api/track/email/click?t=<TOKEN>&url=<ENCODED_URL>`](file:///Users/merinop/Documents/Automatizaciones/Reuso/src/app/api/track/email/click/route.ts).
- El endpoint registra el clic en la base de datos, incrementa `clics_count`, actualiza el estado a `clic` y efectúa una redirección HTTP 302 hacia la URL original.

### C. Desuscripción Inteligente
- Cada destinatario recibe su enlace personalizado a `/unsubscribe?token=<TOKEN>`, permitiendo dar de baja al usuario y registrar la procedencia del opt-out sin forzarlo a escribir su correo manualmente.

---

## 4. Estructura de Tablas en Base de Datos

- **`admin_correos_enviados` (Migración 103):** Registro maestro de campaña/despacho (asunto, tipo, segmento, empresa, remitente, cuerpo HTML).
- **`admin_correos_destinatarios` (Migración 104):** Detalle por receptor (`correo_id`, `email`, `nombre`, `track_token`, `estado`, `aperturas_count`, `primera_apertura_at`, `clics_count`, `primer_clic_at`, `desuscrito`).

---

## 5. Documentos Relacionados
- [[conceptos/plan-de-escalabilidad-anexos|Anexos y Checklist Maestro de Desarrollo]]
- [[conceptos/plan-de-escalabilidad|Plan de Escalabilidad]]
- [[conceptos/sidebar-items-por-rol|Navegación y Sidebar por Rol]]
