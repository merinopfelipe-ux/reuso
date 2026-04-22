-- ============================================================
-- Calculadora de Reúso — Schema Bloque Seguridad y Cadena de Bloques
-- ============================================================

-- 1. Añadimos columnas nativas a la tabla calculos para soportar la cadena de inmutabilidad (Hash Chain)
ALTER TABLE calculos ADD COLUMN IF NOT EXISTS hash_previo text;
ALTER TABLE calculos ADD COLUMN IF NOT EXISTS hash_interno text UNIQUE;

-- 2. Aseguramos el índice para búsquedas ultra-rápidas del top hash por empresa
CREATE INDEX IF NOT EXISTS idx_calculos_hash_chain ON calculos(empresa_id, created_at DESC) WHERE empresa_id IS NOT NULL;
