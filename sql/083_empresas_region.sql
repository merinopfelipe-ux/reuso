-- ============================================================
-- Agrega columna 'region' a la tabla empresas para permitir 
-- clasificar departamentos (Colombia) o estados/provincias.
-- ============================================================

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS region text;
