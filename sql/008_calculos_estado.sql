-- ============================================================
-- Calculadora de Reúso — Schema Bloque 9: Estado en cálculos
-- ============================================================

ALTER TABLE calculos
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'activo'
    CHECK (estado IN ('activo', 'anulado'));

ALTER TABLE calculos
  ADD COLUMN IF NOT EXISTS motivo_anulacion text;

ALTER TABLE calculos
  ADD COLUMN IF NOT EXISTS anulado_por uuid REFERENCES auth.users(id);

ALTER TABLE calculos
  ADD COLUMN IF NOT EXISTS anulado_en timestamptz;

-- Índice para filtrar por estado
CREATE INDEX IF NOT EXISTS idx_calculos_estado ON calculos(estado);
