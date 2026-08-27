---
name: calculo-ambiental
description: Cómo se calcula el CO2 evitado en la Calculadora de Reúso — fórmula real, trazabilidad de factores y regla de inmutabilidad. Usar antes de tocar src/lib/calculos/co2.ts, /api/calcular, o cualquier factor de item_materiales.
---

# Cálculo ambiental — Calculadora de Reúso

## Fuente de verdad del código
La función pura vive en `src/lib/calculos/co2.ts` (exporta `calcularImpacto`, `factorCo2PorKg`, `factorAguaPorKg`, `PARAM_EQUIV`, y los tipos `ItemCalculo`/`ResultadoCalculo`). **Lee ese archivo antes de modificar cualquier cálculo** — no reimplementes la fórmula a partir de este documento, este documento explica el modelo, el código es la fuente exacta.

## Regla de nomenclatura ambiental — "CO2 eq" (directriz del usuario, 2026-07-30)
El impacto ambiental de un material no es solo Dióxido de Carbono puro: incluye otros gases de efecto invernadero (metano, óxido nitroso) convertidos matemáticamente a su equivalente en carbono. Por eso toda cifra CALCULADA se etiqueta **"CO2 eq"** (o "kg CO2 eq"), nunca solo "CO2" a secas — decirlo sin el "eq" es un dato científicamente incompleto.

- **Usar "CO2 eq" / "kg CO2 eq"**: en cualquier texto de interfaz que muestre el resultado de un cálculo (Calculadora, Cotizador, DPP, propuestas, informes, dashboards) y en cualquier variable, columna de BD o campo de API **nuevo** que se cree de aquí en adelante (ej. `impacto_co2_eq`, no `impacto_co2`).
- **Dejar solo "CO2"**: únicamente en texto descriptivo/educativo sobre el proceso biológico real de las plantas — ej. "Equivale a 6 árboles absorbiendo CO2 en un día" (ahí sí es CO2 literal, no una cifra convertida).
- Las columnas/variables **existentes** (`co2_por_unidad`, `co2_total`, `co2_evitado_kg`, etc.) NO se renombran. Decisión explícita del usuario (2026-07-30): la regla "CO2 eq" aplica solo a lo que ve el usuario en pantalla, nunca al esquema de BD ni a nombres de variables en código.

## De dónde salen los factores (Motor Universal)
Los factores de CO₂ NO se ingresan a mano en cada cálculo. Viven en `item_materiales` (dimensión ambiental del catálogo, ver sección "MOTOR LÓGICO UNIVERSAL" en `CLAUDE.md`) y se resumen (rollup) en `items.peso_kg` / `items.co2_por_unidad` al guardar un ítem. El cálculo en vivo solo necesita esos dos campos ya resumidos, nunca vuelve a tocar `item_materiales`.

## Fórmula real
```
factor_co2_por_kg = items.co2_por_unidad / items.peso_kg        (factorCo2PorKg)
co2_evitado_item  = peso_kg_input_del_usuario × factor_co2_por_kg
co2_total         = suma de co2_evitado_item de todos los ítems del cálculo
```
No hay bloques de "servicios", "transporte" ni "insumos nuevos" que restar — esa complejidad se resolvió moviéndola al catálogo (un material con menor `factor_co2_kg` ya refleja un menor beneficio neto). Si algún día se necesita modelar transporte/reparación como impacto negativo, es una función nueva explícita, no una reinterpretación de esta.

## Equivalencias narrativas (`PARAM_EQUIV`, constantes reales)
```
CO2_arbol_anual_kg = 25.0    árbol absorción anual
litros_ducha_5min  = 100.0   ducha estándar de 5 minutos
coches: co2_total / 4600     (factor fijo, ver co2.ts)
```
No inventes ni ajustes estos valores sin que el usuario lo pida explícitamente — son los que ya corren en producción.

## Inmutabilidad — `factor_snapshot_json` (CRÍTICO, ya implementado)
`POST /api/calcular` congela, por cada ítem usado, `{ nombre, co2_por_unidad, peso_kg_unidad, co2_por_kg, nivel_confianza, origen_fuente }` + `param_equiv` + `version_factores` (fecha) + `metodologia`, y lo guarda en `calculos.factor_snapshot_json`. Esto es lo que hace que un informe o pasaporte DPP emitido hoy siga siendo verificable en 5 años aunque el super_admin actualice los factores del catálogo después: **los cálculos pasados nunca se retroactivan**. Cualquier cambio al endpoint de cálculo debe preservar este snapshot completo.

## Reglas de calidad de datos (al cargar/editar `item_materiales`)
- Usa siempre factores alineados con Europa (ecoinvent, ELCD, DEFRA, Product Environmental Footprint). No factores de producción de materiales de otras regiones.
- Todo factor sin fuente europea documentada se marca `nivel_confianza: 'baja'` y `detalle_fuente` explica que es provisional — nunca se inventa una cita o un origen_fuente falso solo para llenar el campo.
- `origen_fuente`/`detalle_fuente` son trazabilidad real: si no sabes la fuente, di que es provisional, no inventes "ecoinvent 3.9" u otro nombre concreto sin verificarlo.

## Recetas por defecto (modo simple)
Cuando un usuario solo da categoría + peso sin desglosar materiales, usa las recetas de referencia en `references/factores-por-categoria.md` (muebles, textiles, electrónica, electrodomésticos) en vez de inventar una composición.
