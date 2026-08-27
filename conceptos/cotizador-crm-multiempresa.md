---
tags: [cotizador, crm, ventas-b2b, catalogo-privado, comites-compra, multiempresa, dominios-datos]
fecha: 2026-08-18
actualizado: 2026-08-20
aliases: [cotizador-crm, crm-ventas-reuso, cotizador-multiempresa, cotizaciones-b2b]
---

# Cotizador B2B y CRM de Ventas Circulares

El **Cotizador B2B de Reúso** es el módulo comercial que permite a las empresas valorar servicios de reacondicionamiento, costear insumos y emitir propuestas comerciales digitales interactivas a clientes corporativos con cálculo ambiental integrado.

---

## 1. Arquitectura y Catálogos Privados

Cada organización gestiona su catálogo propio sin interferencia de datos de terceros (ver [[conceptos/multi-tenant-rls-aislamiento|Multi-Tenant y Aislamiento RLS]]):

1. **Catálogo Privado (`/empresa/catalogo`):** Insumos, servicios y materiales exclusivos de la empresa con sus costos y márgenes de rentabilidad.
2. **Catálogo Universal:** Base de datos centralizada administrada por Super Admin con factores de emisión homologados.
3. **Múltiples Contactos B2B (`crm_clientes_contactos`):** Permite registrar comités de compras (directores de sostenibilidad, compras, gerencia) asociados a un único cliente corporativo (`crm_clientes`).

---

## 2. Flujo de Cotización y Propuestas Digitales

1. **Creación de Cotización (`/empresa/cotizador/nueva`):**
   - Selección del cliente corporativo y destinatario específico del comité.
   - Diagnóstico asistido por IA de imágenes del objeto a reacondicionar.
   - Asignación de servicios de mano de obra e insumos de catálogo.
2. **Cálculo de Precios y Rentabilidad:**
   $$\large P_{\text{ítem}} = \left(\sum \text{Servicios} + \sum (\text{Cantidad}_{\text{insumo}} \times \text{Precio}_{\text{insumo}})\right) \times Factor_{\text{rentabilidad}}$$
   $$\large Total_{\text{propuesta}} = \left(\sum (P_{\text{ítem}} \times \text{Cantidad}) + \text{Transporte} - \text{Descuento}\right) \times (1 + \text{IVA})$$
3. **Snapshot Comercial Inmutable:** Al emitir la propuesta, se congela el estado de costos y tarifas en `crm_cotizaciones.snapshot_json`.
4. **Envío Múltiple y Auditoría:** Checklist para enviar por correo a varios contactos en simultáneo, auditado en `crm_cotizaciones_envios`.
5. **Propuesta Pública Interactiva (`/cot/[token]`):** Vista digital responsive con descarga de PDF, desglose ambiental (CO₂ eq y agua) y botones interactivos de "Aprobar" o "Rechazar" propuesta.

---

## 3. Hoja de Ruta de Desarrollo

### Versión 1 (V1) — Listo para Producción (Ventas B2B)
- **V1 — Paso 1:** Pantalla `/empresa/catalogo` para gestión propia de materiales.
- **V1 — Paso 2:** Pestaña "Contactos" y tabla `crm_clientes_contactos` en `/empresa/clientes/[id]`.
- **V1 — Paso 3:** Selector de contactos específicos en `/empresa/cotizador/nueva`.
- **V1 — Paso 4:** Checklist de envíos múltiples y tabla de auditoría `crm_cotizaciones_envios` en `/empresa/cotizador/[id]`.

### Versión 3 (V3) — Personalización y Marca Blanca
- **V3 — Paso 1:** Marca blanca en propuestas y correos (ver [[conceptos/marca-blanca-internacionalizacion|Marca Blanca e Internacionalización]]).
- **V3 — Paso 2:** Etapas de embudo personalizables por empresa en base de datos.
- **V3 — Paso 3:** Botones interactivos de aprobación directa en `/cot/[token]`.

Ver detalle completo en [[conceptos/plan-de-escalabilidad-anexos|Anexos y Checklist Maestro]].

---

## Relacionado
- [[conceptos/calculo-de-reuso|Cálculo de Reúso — Catálogo Maestro de Métricas]]
- [[conceptos/pasaporte-digital-dpp|Pasaporte Digital de Producto (DPP)]]
- [[conceptos/finanzas-circulares|Finanzas Circulares & Valor del Producto]]
- [[conceptos/multi-tenant-rls-aislamiento|Multi-Tenant y Aislamiento RLS]]
- [[conceptos/plan-de-escalabilidad-multiempresa|Plan de Escalabilidad Multi-Empresa]]
