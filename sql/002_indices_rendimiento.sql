-- ============================================================
-- Calculadora de Reúso — Índices de Rendimiento V1.0
-- Optimización para consultas frecuentes en dashboards y reportes
-- ============================================================

-- 1. Índices para la tabla 'calculos' (la más pesada)
-- Optimiza: filtrado por usuario, empresa y rango de fechas
CREATE INDEX IF NOT EXISTS idx_calculos_user_fecha ON calculos(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_calculos_empresa_fecha ON calculos(empresa_id, fecha DESC);

-- 2. Índices para la tabla 'certificados'
-- Optimiza: listados en panel de certificados
CREATE INDEX IF NOT EXISTS idx_certificados_user ON certificados(user_id);
CREATE INDEX IF NOT EXISTS idx_certificados_empresa ON certificados(empresa_id);

-- 3. Índices para la tabla 'profiles'
-- Optimiza: join frecuente de nombres de usuario y validación de roles/empresas
CREATE INDEX IF NOT EXISTS idx_profiles_empresa ON profiles(empresa_id);

-- 4. Índice GIN para búsqueda de texto en detalle_json (OPCIONAL/AVANZADO)
-- Permite queries más rápidas sobre el contenido del JSON sin cast ::text fuerte
-- Requiere extensión btree_gin o usar jsonb_path_ops
-- Por ahora nos mantenemos con los índices B-Tree estándar para IDs y fechas.

ANALYZE calculos;
ANALYZE certificados;
ANALYZE profiles;
