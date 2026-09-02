-- ============================================================
-- 114 — Reconciliar columnas de Mitigación GRI/ESG y Logística
-- ============================================================
-- Segundo hallazgo del mismo tipo que sql/113: columnas que ya existen en
-- producción (usadas de verdad por src/lib/reportes/mitigacion.ts y
-- logistica.ts) pero sin ningún archivo sql/ que las documente. Detectado
-- comparando el esquema completo de producción contra reuso-staging vía el
-- endpoint OpenAPI de PostgREST (/rest/v1/), no de memoria.
--
-- Valores de enum tomados del código real, no adivinados:
--   · categoria_material: src/lib/schemas/dimensiones.schema.ts (categoriaMaterial)
--   · tipo_vehiculo_transporte: src/lib/reportes/logistica.ts (TipoVehiculoTransporte)
--
-- Es seguro repetirlo: todo va con IF NOT EXISTS, no borra ni modifica
-- ningún dato existente.
-- ============================================================

-- ─── Reporte 2, Mitigación (dominio B): clasificación de materiales ───
ALTER TABLE public.item_materiales
  ADD COLUMN IF NOT EXISTS categoria_material text
    CHECK (categoria_material IN ('madera','metal','textil','cuero','plastico','vidrio','espuma_relleno','carton_papel','otros'));

ALTER TABLE public.categoria_materiales_base
  ADD COLUMN IF NOT EXISTS categoria_material text
    CHECK (categoria_material IN ('madera','metal','textil','cuero','plastico','vidrio','espuma_relleno','carton_papel','otros'));

-- ─── Reporte 3, Logística y Residuo Cero (dominio C): dpp_ciclos ───
ALTER TABLE public.dpp_ciclos
  ADD COLUMN IF NOT EXISTS tipo_vehiculo_transporte text
    CHECK (tipo_vehiculo_transporte IN ('liviano_diesel','mediano_diesel','pesado_diesel')),
  ADD COLUMN IF NOT EXISTS factor_emision_transporte_kg_km numeric(10,4),
  ADD COLUMN IF NOT EXISTS peso_residuo_taller_kg numeric(10,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS peso_residuo_reciclado_kg numeric(10,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS destino_residuo text;
