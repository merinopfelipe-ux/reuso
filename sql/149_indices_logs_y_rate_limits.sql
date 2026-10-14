-- 149: Índices que faltaban y purga de límites de uso.
--
-- logs_auditoria se consulta en cada carga de panel (última visita del usuario:
-- user_id + created_at desc) y no tenía índice. Con la tabla creciendo, esa
-- consulta se hace más lenta con el tiempo. También acelera el SET NULL que
-- aplica la base al borrar una cuenta.
--
-- rate_limits y rate_limits_sensibles solo necesitan las filas de la última
-- hora (la ventana más larga que usa el código). Un índice por fecha permite
-- purgar lo viejo sin recorrer la tabla (cron diario rate-limits-purga).
--
-- Expandir-contraer: solo CREATE INDEX IF NOT EXISTS, no cambia datos ni columnas.
-- Se corre a mano en el SQL Editor de Supabase (staging primero, luego producción).

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_user_created
  ON public.logs_auditoria (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_creado
  ON public.rate_limits (creado_en);

CREATE INDEX IF NOT EXISTS idx_rate_limits_sensibles_creado
  ON public.rate_limits_sensibles (creado_en);
