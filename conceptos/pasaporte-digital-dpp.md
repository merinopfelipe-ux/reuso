---
tags: [dpp, trazabilidad, espir, pasaporte-digital, economia-circular, normativa-europea, dominios-datos]
fecha: 2026-08-18
actualizado: 2026-08-24
aliases: [pasaporte-digital-producto, dpp-reuso, trazabilidad-dpp, espir-latam]
---

# Pasaporte Digital de Producto (DPP / ESPIR)

El **Pasaporte Digital de Producto (DPP)** de Reúso es el motor de trazabilidad física y transparencia que registra la identidad, composición de materiales, ciclos de vida útil, fin de vida y el valor artesanal de los activos recuperados o fabricados por las organizaciones.

---

## 1. Fundamento Normativo (ESPIR UE 2024/1781 & Adaptación Latam)

El diseño del pasaporte sigue los lineamientos del **Reglamento Europeo de Ecodiseño para Productos Sostenibles (ESPIR - UE 2024/1781)**, adaptando sus exigencias al ecosistema comercial e industrial de Latinoamérica:

1. **Identificación Digital Única:** Portador de datos accesible vía QR compatible con GS1 Digital Link.
2. **Composición y Desglose de Materiales:** Identificación porcentual de componentes ($\ge 1\%$), contenido reciclado e inocuidad química.
3. **Durabilidad, Reparabilidad y Repuestos:** Índice de reparabilidad, facilidad de desensamble y disponibilidad de repuestos.
4. **Trazabilidad Multiciclo y Mano de Obra:** Registro de ciclos físicos, operaciones de mantenimiento y el valor del trabajo artesanal local.
5. **Fin de Vida y Reciclabilidad:** Directrices de separación en origen, tasa de reciclabilidad ($R_{\text{fin\_vida}}$) y canales de recogida.

---

## 2. Ficha Maestra de Datos Técnicos y Normativos

### 2.1 Datos Obligatorios por Ley Europea (ESPIR)

| Bloque Normativo | Campo Técnico | Tipo de Dato | Requerimiento / Descripción Operativa |
|---|---|---|---|
| **1. Identificación y Acceso** | `codigo_dpp` | `TEXT UNIQUE` | Identificador único de producto (**UID** / GS1 Digital Link) accesible mediante código QR público. |
| | `operador_economico_id` | `TEXT` | Identificación fiscal del emisor o fabricante responsable (EORI en UE, NIT en Colombia/Latam). |
| | `instalacion_origen_id` | `TEXT` | Identificador del taller o planta de origen/transformación (**GLN / Facility ID**). |
| **2. Composición de Materiales** | `composicion_json` | `JSONB` | Desglose porcentual en peso ($\ge 1\%$) de cada material (madera, acero, espuma, algodón, PET, etc.). |
| | `contenido_reciclado_pct` | `DECIMAL(5,2)` | Porcentaje verificado de contenido reciclado post-consumo y pre-consumo. |
| | `svhc_declaracion` | `BOOLEAN / JSONB` | Declaración de Sustancias Extremadamente Preocupantes (SVHC según REACH / RoHS). |
| **3. Huella Ambiental** | `co2_ciclo_vida_pef` | `DECIMAL(12,4)` | Huella de carbono de ciclo de vida (PEF - Product Environmental Footprint) en kg CO₂e. |
| | `agua_ciclo_vida_litros` | `DECIMAL(12,2)` | Huella hídrica asociada a la fabricación o reacondicionamiento (Litros). |
| **4. Reparabilidad y Durabilidad** | `indice_reparabilidad` | `DECIMAL(3,1)` | Puntuación de reparabilidad (escala de 1.0 a 10.0 según facilidad de desensamble). |
| | `disponibilidad_repuestos_anos`| `INTEGER` | Años garantizados de disponibilidad de repuestos en el mercado. |
| | `manual_desensamble_url` | `TEXT` | Enlace a guía técnica de reparación, despiece y mantenimiento preventivo. |
| **5. Fin de Vida y Reciclaje** | `tasa_reciclabilidad` | `DECIMAL(5,2)` | Porcentaje en peso que es reciclable al final de su vida útil ($R_{\text{fin\_vida}}$). |
| | `instrucciones_disposicion` | `TEXT` | Pautas de separación selectiva en origen y canales autorizados de devolución (EPR). |
| **6. Conformidad Legal** | `declaracion_conformidad_url` | `TEXT` | Declaración de conformidad técnica y cumplimiento normativo. |

---

### 2.2 Atributos Diferenciadores de Alto Valor Agregado (Reúso B2B)

Indicadores propios que elevan el valor comercial y sustentan decisiones de compra corporativa:

1. **Métricas Financieras Circulares:**
   - **Ratio de Retención de Valor ($RRV$):** $\left(\frac{\text{Precio Recuperado}}{\text{Precio Mercado Nuevo}}\right) \times 100$. Demuestra el ahorro patrimonial frente a compras 100% vírgenes.
   - **Costo Total de Propiedad ($TCO_{\text{ciclo}}$):** Costo unitario amortizado por ciclos reales de uso.
   - **Costo Económico Evitado ($Costo_{\text{evitado}}$):** Ahorro generado en adquisición y disposición de residuos.
2. **Línea de Tiempo Multiciclo (Custodia Histórica):**
   - Historial de vidas pasadas (ej. *Ciclo 1: Banco Metropolitano (2021-2024) $\rightarrow$ Ciclo 2: Reacondicionado para Grupo Bolívar (2026)*).
   - Kilómetros recorridos de logística inversa en el proceso de rescate y entrega.
3. **Grado Estético y Funcional (Condition Grading):**
   - **Grado A (Como nuevo):** Sin señales de uso previo, acabados y componentes estructurales 100% calibrados.
   - **Grado B (Excelente estado):** Mínimos detalles cosméticos operativos, tapicería/sellantes reacondicionados a nuevo.
   - **Grado C (Funcional rústico):** Pátina visible de uso previo, estructura re-fortalecida con máxima circularidad.
4. **Sello Criptográfico Anti-Greenwashing:**
   - `hash_integridad` (SHA-256) que sella matemáticamente los datos de emisiones, composición y fechas para auditorías externas.

---

## 3. Modelo de Mano de Obra, Artesanos y Talleres Reacondicionadores

En economía circular, la mano de obra calificada aporta trazabilidad ética, generación de empleo local (criterios ESG) y confianza comercial.

### A. Nomenclatura del Rol en UI y Base de Datos

| Nivel de Presentación | Nombre de Campo Sugerido | Contexto de Uso |
|---|---|---|
| **Corporativo / B2B** | `"Operador de Circularidad"` o `"Técnico Certificado"` | Mobiliario corporativo, TI, equipos industriales. |
| **Artesanal / Premium** | `"Maestro Reacondicionador"` o `"Artesano Circular"` | Ebanistería de autor, marroquinería, tapicería fina, textil. |
| **Estructura en BD** | `responsable_intervencion_json` (en `dpp_ciclos`) | Estructura polimórfica que almacena tanto talleres como artesanos individuales. |

### B. Esquema de Datos por Intervención (`responsable_intervencion_json`)

```json
{
  "responsable_intervencion": {
    "tipo": "maestro_artesano",
    "nombre": "Don Carlos Mario Restrepo",
    "oficio_especialidad": "Maestro Ebanista y Restaurador",
    "taller_nombre": "Taller Circular San Antonio",
    "ubicacion": "Medellín, Antioquia (Colombia)",
    "horas_mano_obra_invertidas": 6.5,
    "tecnicas_aplicadas": [
      "Decapado ecológico sin solventes",
      "Tapizado con textil post-consumo",
      "Ajuste estructural de ensambles"
    ],
    "inspeccion_calidad_aprobada": true,
    "fecha_intervencion": "2026-08-20"
  }
}
```

---

## 4. Modelo de Datos y Tablas en Supabase

El módulo DPP se estructura en 5 tablas con aislamiento estricto por `empresa_id` (ver [[conceptos/multi-tenant-rls-aislamiento|Multi-Tenant y Aislamiento RLS]]):

- `dpp_activos`: Registro del activo físico (código único, nombre, categoría, peso, fotos, `composicion_json`, `indice_reparabilidad`, `tasa_reciclabilidad`, `hash_integridad`).
- `dpp_ciclos`: Historial de ciclos de vida (reacondicionamiento, reventa, mantenimiento, donación, `responsable_intervencion_json`, CO₂ evitado por ciclo).
- `dpp_metricas_financieras`: Snapshot de métricas económicas vinculadas al activo ($RRV$, $TCO$, $E\text{-}ROI$).
- `dpp_documentos_ingesta`: Archivos de soporte (facturas, fotos, fichas técnicas, declaraciones de origen).
- `dpp_verificaciones`: Log de auditoría de escaneos y consultas públicas del pasaporte.

---

## 5. Métricas y Fórmulas Clave del DPP

### 5.1 Tasa de Reciclabilidad al Fin de Vida ($R_{\text{fin\_vida}}$)
Porcentaje del peso total del activo que es separable y reciclable técnicamente:

$$\large R_{\text{fin\_vida}} (\%) = \left(\frac{\sum M_{\text{reciclables\_kg}}}{M_{\text{total\_activo\_kg}}}\right) \times 100$$

### 5.2 Tasa de Inflow Circular ($Inflow_{\text{circular}}$)
Porcentaje de materiales secundarios (reciclados) o renovables incorporados:

$$\large Inflow_{\text{circular}} (\%) = \left(\frac{M_{\text{secundario\_kg}} + M_{\text{renovable\_kg}}}{M_{\text{total\_input\_kg}}}\right) \times 100$$

### 5.3 Impacto Ambiental Multiciclo Acumulado ($CO_{2,\text{acumulado\_dpp}}$)
Acumula las emisiones evitadas netas a lo largo de los ciclos de uso y reacondicionamiento:

$$\large CO_{2,\text{acumulado\_dpp}} = CO_{2,\text{evitado\_base}} \times N_{\text{ciclos\_registrados}}$$

Para el catálogo completo de fórmulas, consultar [[conceptos/calculo-de-reuso|Cálculo de Reúso — Catálogo Maestro de Métricas]].

---

## 6. Flujo de Verificación Pública con QR

Cada activo cuenta con un código QR único que redirige a la vista pública de auditoría:

- **Ruta de Visualización:** `/pasaporte/[codigo]`
- **Buscador de Autenticidad:** `/verificar` y `/verificar/[codigo]` (ver [[conceptos/verificar-codigo-ilike|Búsqueda con ilike]])
- **Contenido Público Enriquecido:**
  - Ficha técnica y composición porcentual de materiales.
  - Indicadores de CO₂ eq evitado y agua preservada.
  - Insignia y firma del **Maestro Reacondicionador / Operador de Circularidad** con horas de mano de obra invertidas.
  - Índice de reparabilidad (1-10) y manual de desensamble.
  - Línea de tiempo interactiva de ciclos físicos de uso.
  - Guía de fin de vida y reciclaje con canales de entrega.
  - Sello criptográfico SHA-256 de autenticidad.

---

## 7. Hoja de Ruta de Desarrollo

En el plan de escalabilidad, el módulo DPP se consolida en la **Versión 2 (V2)**:
- **V2 — Paso 1:** Endpoint `PATCH` para edición de activos y registro estructurado de ciclos con `responsable_intervencion_json` en `/empresa/dpp/[id]`.
- **V2 — Paso 2:** Formulario `/empresa/dpp/nuevo` con estándar ESPIR completo (composición $\ge 1\%$, sustancias SVHC, reparabilidad, reciclabilidad).
- **V2 — Paso 3:** Directorio avanzado y filtros normativos en `/empresa/dpp`.
- **V2 — Paso 4:** Vista pública interactiva enriquecida con insignia artesanal y QR en `/pasaporte/[codigo]`.
- **V2 — Paso 5:** Métricas financieras circulares ($RRV, TCO, E\text{-}ROI$) en `/empresa/metas`.
- **V2 — Paso 6:** Informes ejecutivos consolidados en `/empresa/informes`.

Ver detalle completo en [[proyectos/plan-de-escalabilidad-anexos|Anexos y Checklist Maestro]].

---

## Relacionado
- [[conceptos/calculo-de-reuso|Cálculo de Reúso]]
- [[conceptos/finanzas-circulares|Finanzas Circulares & Valor del Producto]]
- [[conceptos/multi-tenant-rls-aislamiento|Multi-Tenant y Aislamiento RLS]]
- [[proyectos/plan-de-escalabilidad|Plan de Escalabilidad Multi-Empresa]]
- [[conceptos/verificar-codigo-ilike|Búsqueda de Código Verificable]]

