-- 150: Índice de ia_memoria_visual que corresponde a cómo se usa de verdad.
--
-- El código solo la consulta así (src/app/api/cotizador/diagnostico/route.ts):
--   where empresa_id = X and fue_corregido = true order by created_at desc limit 3
-- y solo inserta (cotizaciones/[id]/mueble/route.ts). Nunca busca por vector.
--
-- Hoy tiene un índice ivfflat sobre `embedding` (sql/018, lists = 100) que:
--   · nadie usa (no hay búsqueda por similitud),
--   · se creó con la tabla vacía, así que sus centroides no sirven si algún día se usa,
--   · pesa ~1 MB con 0 filas y se actualiza en cada inserción.
-- Se reemplaza por un índice parcial que sirve exactamente a la consulta real.
--
-- La columna `embedding` NO se toca (expandir-contraer: lo que no se usa se ignora,
-- no se borra). Si algún día se activa la búsqueda por vector, se crea un índice
-- HNSW sobre datos reales.
--
-- Se corre a mano en el SQL Editor (staging primero). Una sentencia por vez.

CREATE INDEX IF NOT EXISTS idx_ia_memoria_visual_empresa_corregidos
  ON public.ia_memoria_visual (empresa_id, created_at DESC)
  WHERE fue_corregido = true;

DROP INDEX IF EXISTS public.idx_ia_memoria_visual_embedding;
