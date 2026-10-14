-- 152: Índices alineados al orden real de los listados.
--
-- crm_cotizaciones: la lista del Cotizador consulta
--   where empresa_id = X order by created_at desc limit 200
--   y hoy solo hay índice (empresa_id, estado).
-- dpp_activos: el listado consulta
--   where empresa_id = X order by created_at desc (paginado)
--   y hoy solo hay índice (empresa_id, estado).
--
-- Con las tablas actuales (pocas filas) la ganancia es pequeña, pero evita que
-- la base ordene en memoria cuando crezcan. Solo agrega índices (expandir-contraer).
-- Se corre a mano en el SQL Editor, una sentencia por vez (staging primero).

CREATE INDEX IF NOT EXISTS idx_crm_cotizaciones_empresa_creada
  ON public.crm_cotizaciones (empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dpp_activos_empresa_creada
  ON public.dpp_activos (empresa_id, created_at DESC);
