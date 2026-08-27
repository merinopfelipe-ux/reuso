---
tags: [marca-blanca, i18n, multimoneda, personalizacion, internacionalizacion, latam]
fecha: 2026-08-18
actualizado: 2026-08-18
aliases: [marca-blanca-reuso, internacionalizacion-reuso, multimoneda-i18n]
---

# Marca Blanca, Personalización e Internacionalización

El módulo de **Marca Blanca e Internacionalización** de Reúso permite a las empresas personalizar la identidad visual de sus propuestas y adaptar la experiencia a diferentes monedas e idiomas en Latinoamérica y el mercado global.

---

## 1. Marca Blanca Corporativa (`/empresa/configuracion/marca`)

Permite a la empresa configurar su identidad propia en todas las interacciones con sus clientes B2B:

- **Identidad Visual:** Logotipo corporativo y colores de acento en propuestas públicas `/cot/[token]`, correos electrónicos y PDFs descargables.
- **Canal de Contacto Directo:** Número de WhatsApp y correo del asesor comercial asignado.
- **Supresión de Marca:** Opción de emitir documentos y propuestas comerciales sin menciones visibles de la marca Reúso.

---

## 2. Personalización de Etapas del Embudo de Ventas

En lugar de imponer un flujo rígido, las empresas pueden configurar sus etapas comerciales en base de datos:

- Nombre personalizado de etapas (ej. *Diagnóstico*, *Comité*, *Aprobada*, *Reacondicionando*, *Entregada*).
- Reglas de transición, colores representativos y orden secuencial.

---

## 3. Multimoneda Dinámica (23 Países)

El sistema integra formateo monetario regional en `src/lib/locale.ts`:

- Detección del país de la empresa emisora.
- Formateo automático de símbolos, puntos y decimales:
  - **Pesos Colombianos (COP):** `$ 1'500.000` (apóstrofe para millones, punto para miles).
  - **Dólares (USD):** `$1,500,000.00`
  - **Reales (BRL):** `R$ 1.500.000,00`
  - **Pesos Mexicanos (MXN):** `$1,500,000.00`

---

## 4. Soporte Multiidioma (i18n)

Configuración de traducción integral de la interfaz y propuestas digitales públicas en:
- Español (`es`)
- Inglés (`en`)
- Portugués (`pt`)

Implementado mediante selectores del sistema (sin menús nativos del navegador).

---

## 5. Hoja de Ruta de Desarrollo

Este conjunto de capacidades se construye en la **Versión 3 (V3)**:
- **V3 — Paso 1:** Configuración de marca blanca integral en `/empresa/configuracion/marca`.
- **V3 — Paso 2:** Etapas de embudo personalizables por empresa en base de datos.
- **V3 — Paso 3:** Botones interactivos de aprobación en `/cot/[token]`.
- **V3 — Paso 4:** Formateador multimoneda de 23 países en `src/lib/locale.ts`.
- **V3 — Paso 5:** Soporte multiidioma global (i18n).

Ver detalle completo en [[conceptos/plan-de-escalabilidad-anexos|Anexos y Checklist Maestro]].

---

## Relacionado
- [[conceptos/cotizador-crm-multiempresa|Cotizador B2B y CRM]]
- [[conceptos/plan-de-escalabilidad-multiempresa|Plan de Escalabilidad Multi-Empresa]]
- [[conceptos/multi-tenant-rls-aislamiento|Multi-Tenant y Aislamiento RLS]]
