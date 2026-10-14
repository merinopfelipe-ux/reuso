-- 149 (versión producción): mismos índices que sql/149_indices_logs_y_rate_limits.sql,
-- creados CONCURRENTLY para no bloquear las escrituras de la tabla mientras se construyen.
--
-- IMPORTANTE: CREATE INDEX CONCURRENTLY no puede correr dentro de una transacción.
-- El SQL Editor de Supabase agrupa varias sentencias en una sola transacción, así
-- que se corre UNA sentencia por vez: selecciona solo una, pulsa Run, espera el
-- "Success", y sigue con la siguiente.
--
-- Si una falla a medias deja un índice inválido: bórralo con
--   DROP INDEX CONCURRENTLY IF EXISTS public.<nombre>;
-- y vuelve a correr su sentencia.

-- Sentencia 1
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_auditoria_user_created
  ON public.logs_auditoria (user_id, created_at DESC);

-- Sentencia 2
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_creado
  ON public.rate_limits (creado_en);

-- Sentencia 3
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_sensibles_creado
  ON public.rate_limits_sensibles (creado_en);
