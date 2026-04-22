---
name: calculo-ambiental
description: Lógica de cálculo de ahorro de CO2. Usar SIEMPRE que se implemente o modifique la función de cálculo ambiental, la API de cálculo, los tipos TypeScript de impacto, los factores de emisión, la generación de certificados/informes, los tres modos de precisión (simple/intermedio/avanzado), o cualquier lógica relacionada con CO2, emisiones, equivalencias (árboles, duchas) o el campo factor_snapshot_json.
---

# Cálculo ambiental — reuso.lurdes.co

## Propósito

Calcula el **ahorro neto de emisiones de GEI** cuando alguien reusa un objeto físico en lugar de comprar uno nuevo. El dato base es el **peso del objeto** y las operaciones de reúso realizadas. La salida principal es el **CO₂ evitado neto** en kg CO₂-eq, con equivalencias narrativas fáciles de comunicar.

## Enfoque geográfico

Usar siempre factores alineados con Europa (ISO 14040/14044, Product Environmental Footprint, ecoinvent, ELCD). No usar factores de América para producción de materiales. Los factores internos provisionales deben tener `origen_fuente` y `detalle_fuente`.

---

## Modelo en tres bloques

**Bloque 1 — Materiales reusados**
Cada kg de material reutilizado evita parte de las emisiones de producir ese material nuevo.

**Bloque 2 — Impactos del reúso**
Reparar, reacondicionar y transportar también genera emisiones — hay que restarlas.

**Bloque 3 — Equivalencias narrativas**
Traducir el resultado a árboles que absorben CO₂ y duchas de 10 minutos.

```
CO2_ahorro_neto_kg = CO2_ahorro_materiales_kg - CO2_reuso_kg
```

Si el resultado es negativo, el reúso genera más impacto del que evita. Reportarlo igualmente marcándolo como "impacto neto adicional".

---

## Fórmulas

### 1. Ahorro por materiales
```
CO2_ahorro_materiales_kg = SUM_m( peso_m_kg × factor_ahorro_mat_kgCO2_kg )
```

### 2. Emisiones del reúso
```
CO2_servicios_kg      = SUM_s( cantidad × factor_servicio_kgCO2_unidad )
CO2_transporte_kg     = distancia_km × peso_kg × factor_transp_kgCO2_km_kg
CO2_insumos_nuevos_kg = SUM_i( peso_i_kg × factor_prod_insumo_kgCO2_kg )
CO2_reuso_kg          = CO2_servicios_kg + CO2_transporte_kg + CO2_insumos_nuevos_kg
```

### 3. Equivalencias
```
CO2_arbol_dia_kg = CO2_arbol_anual_kg / 365
arbol_dias_eq    = CO2_ahorro_neto_kg / CO2_arbol_dia_kg
duchas_10min_eq  = CO2_ahorro_neto_kg / CO2_ducha_10min_kg
litros_agua_eq   = duchas_10min_eq × litros_ducha_10min
```

### Parámetros de equivalencia (valores por defecto)
- `CO2_arbol_anual_kg`: 8.0 kg CO₂/año (árbol urbano europeo, conservador)
- `litros_ducha_10min`: 90 L (ducha eficiente, 9 L/min × 10 min)
- `CO2_ducha_10min_kg`: 2.0 kg CO₂

---

## Tres modos de precisión

### Modo simple
La persona solo da: categoría + peso total.
El sistema usa una receta estándar de materiales y un servicio estándar según categoría. Ideal para onboarding o estimaciones rápidas.

### Modo intermedio ← recomendado para producción inicial
La persona da: categoría + peso + materiales principales + servicios aplicados + distancia.
Este es el equilibrio entre precisión y facilidad de uso.

### Modo avanzado
La persona edita todos los campos: materiales con pesos exactos, todos los servicios, transporte por tramos, insumos nuevos, factores específicos. Para usuarios técnicos o administradores.

---

## Datos de entrada por modo

### Datos mínimos (modo simple)
```json
{
  "id_objeto": "string",
  "categoria": "mueble | textil | electro | otro",
  "descripcion": "string",
  "peso_total_kg": number
}
```

### Datos completos (modo intermedio/avanzado)
```json
{
  "id_objeto": "string",
  "categoria": "string",
  "descripcion": "string",
  "peso_total_kg": number,
  "materiales": [
    { "nombre": "string", "peso_kg": number, "factor_ahorro_kgCO2_kg": number }
  ],
  "servicios": [
    { "tipo": "string", "cantidad": number, "factor_kgCO2_unidad": number }
  ],
  "transporte": {
    "distancia_km": number,
    "peso_kg": number,
    "factor_kgCO2_km_kg": number
  },
  "insumos_nuevos": [
    { "nombre": "string", "peso_kg": number, "factor_kgCO2_kg": number }
  ],
  "equivalencias": {
    "CO2_arbol_anual_kg": 8.0,
    "litros_ducha_10min": 90,
    "CO2_ducha_10min_kg": 2.0
  }
}
```

Cuando el usuario no detalla composición, usar las recetas por defecto de `references/factores-por-categoria.md`.

---

## Reglas de calidad de datos

Cada factor almacenado en la tabla maestra debe tener trazabilidad:

```json
{
  "material_o_proceso": "Madera dura reutilizada",
  "unidad": "kg CO2e/kg",
  "valor": 0.86,
  "origen_fuente": "CO2-evitado-1.xlsx",
  "detalle_fuente": "Hoja Insumos, factor interno base ecoinvent"
}
```

Los factores sin fuente europea clara deben marcarse como provisionales en `detalle_fuente`. La tabla maestra de factores es editable por el super_admin desde /admin — los cambios aplican solo a cálculos futuros (ver sección de inmutabilidad más abajo).

---

## Ejemplo completo: silla de madera pintada (7 kg)

**Entrada:**
- 6.5 kg madera dura (factor 0.86), 0.5 kg acero (factor 1.75)
- Servicio: pintar × 1 (factor 0.8 kg CO₂)
- Transporte: 25 km, furgoneta (factor 0.00005 kg CO₂/km·kg)
- Insumo nuevo: 0.2 kg barniz (factor 4.0 kg CO₂/kg)

**Cálculo:**
```
Ahorro materiales:
  Madera = 6.5 × 0.86 = 5.59 kg CO₂
  Acero  = 0.5 × 1.75 = 0.875 kg CO₂
  Total  = 6.465 kg CO₂

Impactos reúso:
  Pintura    = 1 × 0.8   = 0.800 kg CO₂
  Transporte = 25 × 7 × 0.00005 = 0.00875 kg CO₂
  Barniz     = 0.2 × 4.0 = 0.800 kg CO₂
  Total      = 1.60875 kg CO₂

Ahorro neto = 6.465 - 1.60875 = 4.856 kg CO₂-eq
```

**Equivalencias:**
```
Árbol:   4.856 / (8/365) = ~222 días absorbiendo CO₂
Duchas:  4.856 / 2.0 = ~2.4 duchas de 10 min (~219 litros)
```

**Resultado narrativo:**
> Reusar esta silla evita aproximadamente **4.86 kg CO₂-eq** — lo que absorbe un árbol urbano europeo en unos **222 días**, o la huella de **2.4 duchas de 10 minutos**.

---

## Inmutabilidad — factor_snapshot_json (CRÍTICO)

Los factores de emisión cambian con el tiempo (el super_admin los actualiza). Para garantizar que un certificado emitido hoy sea verificable en 5 años, **el cálculo debe guardar una copia de los factores usados en el momento de calcular**.

Campo obligatorio en la tabla `calculos`:
```json
{
  "factor_snapshot_json": {
    "materiales": [...],
    "servicios": [...],
    "transporte": {...},
    "insumos_nuevos": [...],
    "param_equiv": {...},
    "version_factores": "2025-04-03",
    "metodologia": "ACV simplificado, factores europeos ecoinvent/ELCD"
  }
}
```

El super_admin actualiza factores para **futuros** cálculos. Los cálculos pasados **nunca se retroactivan**.

---

## Salida del cálculo

```json
{
  "id_objeto": "OBJ-001",
  "descripcion": "Silla de madera pintada",
  "CO2_ahorro_materiales_kg": 6.465,
  "CO2_reuso_kg": 1.60875,
  "CO2_ahorro_neto_kg": 4.856,
  "es_impacto_neto_adicional": false,
  "equivalencias": {
    "arbol_dias_eq": 221.8,
    "arbol_anios_eq": 0.607,
    "duchas_10min_eq": 2.43,
    "litros_agua_eq": 218.5
  },
  "fuentes_aplicadas": [
    { "tipo": "material", "nombre": "Madera dura", "fuente": "ecoinvent 3.9, proceso de producción madera sólida Europa" },
    { "tipo": "material", "nombre": "Acero", "fuente": "factor interno provisional, base ELCD" },
    { "tipo": "equivalencia", "nombre": "árbol urbano", "fuente": "referencia europea conservadora 8 kg CO₂/año" }
  ],
  "factor_snapshot_json": { ... },
  "notas": {
    "metodologia": "Cálculo basado en factores por kg de material reutilizado, datos de ACV europeos.",
    "limitaciones": "Valores orientativos. Para decisiones críticas se recomienda un ACV detallado."
  }
}
```

---

## Tipos TypeScript

```typescript
interface MaterialReusado {
  nombre: string
  peso_kg: number
  factor_ahorro_kgCO2_kg: number
}

interface ServicioReuso {
  tipo: string
  cantidad: number
  factor_kgCO2_unidad: number
}

interface Transporte {
  distancia_km: number
  peso_kg: number
  factor_kgCO2_km_kg: number
}

interface InsumoNuevo {
  nombre: string
  peso_kg: number
  factor_kgCO2_kg: number
}

interface ParamEquiv {
  CO2_arbol_anual_kg: number   // default: 8.0
  litros_ducha_10min: number   // default: 90.0
  CO2_ducha_10min_kg: number   // default: 2.0
}

interface InputCalculo {
  descripcion: string
  categoria: string
  peso_total_kg: number
  materiales: MaterialReusado[]
  servicios: ServicioReuso[]
  transporte: Transporte
  insumos_nuevos: InsumoNuevo[]
  equivalencias: ParamEquiv
}

interface ResultadoCalculo {
  CO2_ahorro_materiales_kg: number
  CO2_reuso_kg: number
  CO2_ahorro_neto_kg: number
  es_impacto_neto_adicional: boolean
  equivalencias: {
    arbol_dias_eq: number
    arbol_anios_eq: number
    duchas_10min_eq: number
    litros_agua_eq: number
  }
  fuentes_aplicadas: Array<{ tipo: string; nombre: string; fuente: string }>
  factor_snapshot_json: object
  notas: { metodologia: string; limitaciones: string }
}
```

---

## Implementación — módulo puro (lib/calculos/co2.ts)

Encapsular en una función pura (sin efectos de E/S) para máxima testabilidad:

```typescript
export function calcularAhorroNeto(input: InputCalculo): ResultadoCalculo {
  // 1. Ahorro materiales
  const CO2_ahorro_materiales_kg = input.materiales.reduce(
    (sum, m) => sum + m.peso_kg * m.factor_ahorro_kgCO2_kg, 0
  )

  // 2. Impactos reúso
  const CO2_servicios_kg = input.servicios.reduce(
    (sum, s) => sum + s.cantidad * s.factor_kgCO2_unidad, 0
  )
  const CO2_transporte_kg =
    input.transporte.distancia_km * input.transporte.peso_kg * input.transporte.factor_kgCO2_km_kg
  const CO2_insumos_nuevos_kg = input.insumos_nuevos.reduce(
    (sum, i) => sum + i.peso_kg * i.factor_kgCO2_kg, 0
  )
  const CO2_reuso_kg = CO2_servicios_kg + CO2_transporte_kg + CO2_insumos_nuevos_kg

  // 3. Ahorro neto
  const CO2_ahorro_neto_kg = CO2_ahorro_materiales_kg - CO2_reuso_kg

  // 4. Equivalencias
  const { CO2_arbol_anual_kg, litros_ducha_10min, CO2_ducha_10min_kg } = input.equivalencias
  const arbol_dias_eq = CO2_ahorro_neto_kg / (CO2_arbol_anual_kg / 365)
  const duchas_10min_eq = CO2_ahorro_neto_kg / CO2_ducha_10min_kg

  return {
    CO2_ahorro_materiales_kg,
    CO2_reuso_kg,
    CO2_ahorro_neto_kg,
    es_impacto_neto_adicional: CO2_ahorro_neto_kg < 0,
    equivalencias: {
      arbol_dias_eq,
      arbol_anios_eq: CO2_ahorro_neto_kg / CO2_arbol_anual_kg,
      duchas_10min_eq,
      litros_agua_eq: duchas_10min_eq * litros_ducha_10min,
    },
    fuentes_aplicadas: [],  // poblar desde tabla maestra de factores
    factor_snapshot_json: { ...input },
    notas: {
      metodologia: 'Cálculo basado en factores por kg de material reutilizado, datos de ACV europeos.',
      limitaciones: 'Valores orientativos. Para decisiones críticas se recomienda un ACV detallado.',
    },
  }
}
```

---

## API route — POST /api/calcular

1. Validar con zod (server-side)
2. Obtener factores actuales de Supabase (o usar defaults de `references/factores-por-categoria.md`)
3. Llamar a `calcularAhorroNeto()`
4. Guardar en tabla `calculos` con `factor_snapshot_json` completo
5. Retornar el resultado

---

## Factores por defecto — references/factores-por-categoria.md

Cuando el usuario solo ingresa peso y categoría (modo simple), consultar ese archivo para recetas de composición por defecto. Categorías cubiertas: muebles (madera, metal, tapizado), textiles, electrónica, electrodomésticos, con sus factores de servicios y transporte.
