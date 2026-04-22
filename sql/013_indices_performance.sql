-- Migración 013: Índices de performance para búsquedas frecuentes
-- Ejecutar en Supabase SQL Editor

-- Índice en codigo_verificacion para la página /verificar/[codigo]
-- La búsqueda usa ilike() sin índice actualmente
CREATE INDEX IF NOT EXISTS idx_certificados_codigo
  ON certificados(codigo_verificacion);
