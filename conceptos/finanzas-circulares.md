---
tags: [finanzas, circularidad, roi, tco, metricas-economicas, metas-empresa, dominios-datos]
fecha: 2026-08-18
actualizado: 2026-08-20
aliases: [finanzas-circulares, metricas-financieras-reuso, e-roi-tco, valor-economico-reuso]
---

# Finanzas Circulares & Valor Económico del Producto

El motor de **Finanzas Circulares** de Reúso cuantifica el valor económico retenido y el retorno financiero generado al optar por modelos de reutilización y reacondicionamiento frente a la adquisición lineal de activos vírgenes.

---

## 1. Métricas Financieras y Fórmulas Matemáticas

Implementadas en el motor puro `src/lib/calculos/financiero.ts`:

### 1.1 Ratio de Retención de Valor Económico ($RRV$)
Compara el precio de mercado del producto recuperado frente al precio de un producto nuevo equivalente:

$$\large RRV (\%) = \left(\frac{\text{Precio Mercado Producto Recuperado}}{\text{Precio Mercado Producto Nuevo Equivalente}}\right) \times 100$$

### 1.2 Costo Total de Propiedad por Ciclo ($TCO_{\text{ciclo}}$)
Mide el costo integral de poseer y mantener el activo distribuido entre sus ciclos reales de uso:

$$\large TCO_{\text{ciclo}} = \frac{C_{\text{adquisición}} + C_{\text{operación}} + C_{\text{mantenimiento}} + C_{\text{disposición}} - V_{\text{reventa}}}{\max(N_{\text{ciclos}}, 1)}$$

### 1.3 Costo Económico Evitado ($Costo_{\text{evitado}}$)
Ahorro financiero directo por no comprar material virgen, evitar tarifas de vertedero y evitar impuestos al carbono:

$$\large Costo_{\text{evitado}} = (P_{\text{virgen}} \times Q_{\text{circular}}) + C_{\text{disposición\_evitado}} + C_{\text{impuesto\_evitado}}$$

### 1.4 Retorno de Inversión en Economía Circular (E-ROI)
Rendimiento financiero de la inversión ejecutada en proyectos de reacondicionamiento:

$$\large E\text{-}ROI (\%) = \left(\frac{\text{Ahorro Operativo} + Costo_{\text{evitado}}}{\text{Inversión en Circularidad}}\right) \times 100$$

### 1.5 Tasa de Inflow Circular (% Materiales Secundarios/Renovables)
$$\large Inflow_{\text{circular}} (\%) = \left(\frac{M_{\text{secundario\_kg}} + M_{\text{renovable\_kg}}}{M_{\text{total\_input\_kg}}}\right) \times 100$$

Para consultar el compendio completo de fórmulas, ver [[conceptos/calculo-de-reuso|Cálculo de Reúso — Catálogo Maestro de Métricas]].

---

## 2. Aplicación en la Plataforma

- **Panel de Metas Corporativas (`/empresa/metas`):** Comparativas de presupuesto ejecutado vs. costo evitado y retorno de inversión acumulado.
- **Detalle de Pasaporte Digital (`/empresa/dpp/[id]`):** TCO y retención de valor específico de cada activo físico (ver [[conceptos/pasaporte-digital-dpp|Pasaporte Digital de Producto]]).
- **Informes Ejecutivos Consolidados (`/empresa/informes`):** Generación de balances ejecutivos para juntas directivas y comités de sostenibilidad.

---

## 3. Hoja de Ruta de Desarrollo

En el plan de escalabilidad, el motor financiero se desarrolla en la **Versión 2 (V2 — Paso 5)**:
- Integración de funciones analíticas en `src/lib/calculos/financiero.ts`.
- Visualizadores dinámicos en `/empresa/metas` y `/empresa/informes`.

Ver detalle en [[conceptos/plan-de-escalabilidad-anexos|Anexos y Checklist Maestro]].

---

## Relacionado
- [[conceptos/calculo-de-reuso|Cálculo de Reúso]]
- [[conceptos/pasaporte-digital-dpp|Pasaporte Digital de Producto (DPP)]]
- [[conceptos/cotizador-crm-multiempresa|Cotizador B2B y CRM]]
- [[conceptos/plan-de-escalabilidad-multiempresa|Plan de Escalabilidad Multi-Empresa]]
