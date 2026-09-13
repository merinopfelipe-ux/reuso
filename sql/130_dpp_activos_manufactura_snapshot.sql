-- Huella de manufactura original del activo, calculada UNA SOLA VEZ al crear
-- el DPP (nunca se recalcula después) — es la pieza que faltaba para que
-- "Mitigación por ciclos" (cálculo #6) no cuente la manufactura evitada en
-- cada ciclo, solo en el primero. Metodología aprobada por el usuario
-- 2026-09-05, ver conceptos/normativa-europea-dpp-y-reclamos-ambientales.md
-- sección 4 del Vault del proyecto.
ALTER TABLE dpp_activos
  ADD COLUMN IF NOT EXISTS co2_manufactura_kg numeric(12,4) NOT NULL DEFAULT 0;

COMMENT ON COLUMN dpp_activos.co2_manufactura_kg IS
  'CO2 evitado por no fabricar el activo desde material virgen, calculado una sola vez a partir de composicion_json al crear el activo. Nunca se recalcula en ciclos posteriores.';
