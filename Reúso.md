---
tags: [inicio, reuso, indice, arquitectura, metricas, circularidad]
aliases: [inicio, home, index, calculo-de-reuso, plataforma-reuso]
---

# Reúso — Plataforma Integral de Sostenibilidad y Economía Circular

> Plataforma multi-empresa que cuantifica el impacto ambiental, valida la trazabilidad física mediante Pasaporte Digital de Producto (DPP / ESPIR) y optimiza las finanzas circulares y cotizaciones B2B.
> **Producto de Grupo MLP S.A.S.** · reuso.lurdes.co · servicio@lurdes.co

---

## 1. Módulos y Motores de Cálculo de la Plataforma

Reúso articula 4 dominios de medición y gestión para entregar valor cuantificable a empresas y comités de compra:

### A. [[conceptos/cotizador-crm-multiempresa|Cotizador B2B y CRM Circular]] (Dominio Costos)
- **Cálculo de Propuestas:** Generación de cotizaciones con desglose de servicios de mano de obra, insumos de reacondicionamiento y factor de rentabilidad.
- **Interacción B2B:** Propuestas públicas interactivas con aprobación/rechazo en línea, envío múltiple a comités de compras y auditoría de envíos.
- **Fórmula:** $Total_{\text{propuesta}} = \left(\sum (P_{\text{ítem}} \times \text{Cantidad}) + \text{Transporte} - \text{Descuento}\right) \times (1 + \text{IVA})$.

### B. [[conceptos/pasaporte-digital-dpp|Pasaporte Digital de Producto (DPP / ESPIR)]] (Dominio Trazabilidad)
- **Cumplimiento Normativo:** Estructuración bajo el estándar europeo ESPIR (UE 2024/1781) adaptado a Latam: desglose $\ge 1\%$, sustancias SVHC, índice de reparabilidad (1-10) y tasa $R_{\text{fin\_vida}}$.
- **Trazabilidad Multiciclo y Artesanal:** Registro de ciclos de vida ($CO_{2,\text{acumulado}} = CO_{2,\text{base}} \times N_{\text{ciclos}}$), firma de taller/artesano y horas hombre invertidas.
- **Verificación Pública:** Auditoría interactiva por QR con sello criptográfico SHA-256 (`hash_integridad`).

### C. [[conceptos/finanzas-circulares|Finanzas Circulares & Retorno de Inversión]] (Dominio Financiero)
- **Retorno de Inversión Circular ($E\text{-}ROI$):** $E\text{-}ROI (\%) = \left(\frac{\text{Ahorro Operativo} + Costo_{\text{evitado}}}{\text{Inversión Circular}}\right) \times 100$.
- **Costo Total de Propiedad ($TCO_{\text{ciclo}}$):** $TCO_{\text{ciclo}} = \frac{C_{\text{adquisición}} + C_{\text{operación}} + C_{\text{mantenimiento}} + C_{\text{disposición}} - V_{\text{reventa}}}{\max(N_{\text{ciclos}}, 1)}$.
- **Costo Económico Evitado ($Costo_{\text{evitado}}$):** $(P_{\text{virgen}} \times Q_{\text{circular}}) + C_{\text{disposición\_evitado}} + C_{\text{impuesto\_evitado}}$.
- **Ratio de Retención de Valor ($RRV$):** $\left(\frac{\text{Precio Mercado Recuperado}}{\text{Precio Mercado Nuevo}}\right) \times 100$.

### D. [[conceptos/calculo-de-reuso|Calculadora de Impacto Ambiental]] (Dominio Ambiental)
- **Emisiones Evitadas de CO₂:** $CO_{2,\text{total}} = \sum (\text{peso\_input\_kg}_i \times f_{CO_2, i})$ en kg CO₂e.
- **Preservación Hídrica:** $Agua_{\text{total}} = \sum (\text{peso\_input\_kg}_i \times f_{\text{agua}, i})$ en Litros.
- **Equivalencias de Impacto:** Árboles diarios ($\left\lfloor \frac{CO_{2,\text{total}}}{25{,}0 / 365} \right\rceil$), Duchas ahorradas ($\left\lfloor \frac{Agua_{\text{total}}}{100} \right\rceil$), Autos retirados ($\frac{CO_{2,\text{total}}}{4600}$) y Residuos desviados ($\sum \text{kg}$).
- **Inmutabilidad:** Registro en `factor_snapshot_json` para blindar auditorías, reportes y cotizaciones.

---

## 2. Hoja de Ruta y Escalabilidad Multi-Empresa

El plan de evolución técnica y funcional está documentado en las especificaciones maestras:

1. **[[proyectos/plan-de-escalabilidad|Plan de Escalabilidad (V1, V2, V3)]]:**
   - **DevOps Base:** CI/CD en GitHub Actions, Staging aislado, Seed local, suite RLS automatizada y migraciones expandir-contraer.
   - **V1 (Listo para Producción):** Catálogos privados por empresa, múltiples contactos por cliente, envíos múltiples y permisos de equipo.
   - **V2 (DPP y Métricas Avanzadas):** Pasaporte digital ESPIR, edición `PATCH`, finanzas circulares ($RRV, TCO, E\text{-}ROI$) e informes consolidados.
   - **V3 (Marca Blanca e Internacionalización):** [[conceptos/marca-blanca-internacionalizacion|Marca blanca 100% editable]], etapas personalizadas de embudo, multimoneda 23 países y soporte i18n.

2. **[[proyectos/plan-de-escalabilidad-anexos|Anexos de Tareas y Tabla Maestra de Checklist]]:**
   - Mapeo exhaustivo de las 76 rutas del sistema ordenadas por prioridad de construcción.

---

## 3. Reglas de Oro, Ética y Core de Negocio

- **[[reglas/reglas-de-oro|Las Reglas de Oro del Ecosistema Reúso]]** — Los 5 pilares inquebrantables de desarrollo: Frugalidad, Arquitectura, Formatos, UI y Diseño Visual, y Seguridad Nativa.
- **[[conceptos/etica-ia-y-autoridad-humana|Principios Éticos y Autoridad Humana]]** — La IA propone, el humano dispone. Reglas de privacidad y soberanía de datos.
- **[[conceptos/calculo-de-reuso|Cálculo de Reúso]]** — Catálogo maestro de métricas, fundamentos y fórmulas matemáticas completas.
- **[[conceptos/wysiwyg-rich-text-editor|Estándar de Editores de Texto]]** — Reutilización estricta del componente RichTextEditor unificado.

---

## 4. Red de Conceptos y Arquitectura Técnica en el Vault

- **[[conceptos/pasaporte-digital-dpp|Pasaporte Digital de Producto (DPP)]]** — Trazabilidad física, estándar ESPIR y ciclos de vida.
- **[[conceptos/cotizador-crm-multiempresa|Cotizador B2B y CRM]]** — Catálogo privado, comités de compra y propuestas interactivas.
- **[[conceptos/trazabilidad-aperturas-correos|Trazabilidad y Métricas de Correos]]** — Píxel de apertura invisible, medición de clics y tracking individual.
- **[[conceptos/finanzas-circulares|Finanzas Circulares]]** — TCO, E-ROI, retención de valor y costo económico evitado.
- **[[conceptos/multi-tenant-rls-aislamiento|Multi-Tenant y RLS]]** — Aislamiento estricto por `empresa_id` y seguridad en Supabase.
- **[[conceptos/marca-blanca-internacionalizacion|Marca Blanca e Internacionalización]]** — Whitelabel, multimoneda 23 países y soporte i18n.
- **[[conceptos/plan-maestro-reuso-v4|Plan Maestro V4]]** — Histórico de los 10 bloques completados.
- **[[conceptos/historial-calculos-detalle|Detalle de Cálculos y Snapshots]]** — Estructura de `detalle_json` e inmutabilidad.
- **[[conceptos/role-routing-nextjs|Routing por Rol]]** — Guards y redirecciones por perfil.
- **[[conceptos/sidebar-items-por-rol|Navegación por Rol]]** — Estructura de menús en LayoutShell.
- **[[conceptos/dashboard-bifurcacion-rol|Bifurcación de Dashboard]]** — Lógica Server Component por tipo de usuario.
- **[[conceptos/modo-empleado-cookie|Modo Colaborador]]** — Sesión dual para empresa_admin.
- **[[conceptos/modulos-filtro-calculadora|Filtro de Módulos Activos]]** — Inyección de líneas de negocio por empresa.
- **[[conceptos/verificar-codigo-ilike|Verificación Pública]]** — Búsqueda de autenticidad e inmutabilidad de pasaportes.

---

## 4. Arquitectura de Rutas del Sistema

```
app/(auth)/       → /login, /registro, /recuperar, /invitacion, /confirmar-email
app/(dashboard)/  → Panel B2C individual y empleado (calculadora, historial, objetos, soporte)
app/(empresa)/    → Panel B2B (ventas, cotizador, clientes, catalogo, dpp, calculos, metas, equipo, informes)
app/(admin)/      → Panel Super Admin (empresas, categorias, catalogo-universal, reportes, logs, modulos)
app/pasaporte/    → Vista pública de pasaporte digital de producto (DPP)
app/verificar/    → Buscador público de autenticidad de pasaportes digitales (DPP)
app/cot/          → Propuesta comercial digital interactiva para contactos B2B
app/api/          → Endpoints server-side seguros con RLS multi-empresa
```

---

## 5. Planes de Suscripción

| Plan | ID | Cálculos/mes | Empleados | Informes/mes | Catálogo Privado |
|------|----|-------------|-----------|--------------|------------------|
| Explora | `free` | 10 | 1 | 0 | No |
| Circular Lab | `lab` | 200 | 5 | 2 | Sí |
| Impulso Sostenible | `impulso` | 200 | 10 | 2 | Sí |
| Impacto Ilimitado | `ilimitado` | Ilimitado | Ilimitado | Ilimitado | Sí |

---

## 6. Manejo de Estado del Proyecto

- **[[STATE]]** (Memoria a Corto Plazo): Ubicado en la raíz del repositorio. Contiene los pendientes inmediatos y el contexto del sprint actual para la IA.
- **[[proyectos/estado-actual|Estado Actual Histórico]]** (Memoria a Largo Plazo): Registro histórico de módulos terminados y versiones estables desplegadas.
