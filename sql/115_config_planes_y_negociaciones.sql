-- ============================================================
-- 115 — Config de planes editable (super_admin) + negociaciones por empresa
-- ============================================================
-- Diseñado con el usuario el 2026-09-02. Reemplaza los precios/límites
-- fijos en código por una fuente de verdad editable, con borrador/publicar,
-- y permite que una empresa puntual tenga su propia negociación que nunca
-- se ve afectada por cambios futuros al plan global.
--
-- config_planes: 4 filas fijas (una por plan). Columnas "borrador_*" son lo
-- que el super_admin edita libremente; al publicar, se copian a las
-- columnas reales (las que el sistema usa de verdad para cobrar y limitar).
-- limite_* en NULL = ilimitado (igual que el plan "ilimitado" hoy).
--
-- empresas_negociaciones: fila opcional por empresa. Si existe, SIEMPRE
-- reemplaza por completo los 6 valores del plan global para esa empresa
-- (nunca una mezcla campo por campo, para no tener ambigüedad de qué NULL
-- significa "usa el global" vs "ilimitado"). Si no existe la fila, la
-- empresa usa lo publicado en config_planes normalmente.
-- ============================================================

CREATE TABLE IF NOT EXISTS config_planes (
  id text PRIMARY KEY CHECK (id IN ('free', 'lab', 'impulso', 'ilimitado')),

  -- Publicado: lo que el sistema aplica de verdad hoy
  precio_cop numeric(14,2) NOT NULL,
  precio_usd numeric(14,2) NOT NULL,
  precio_eur numeric(14,2) NOT NULL,
  limite_empleados integer,
  limite_calculos_mes integer,
  limite_informes_mes integer,

  -- Borrador: lo que el super_admin está editando, todavía no visible
  borrador_precio_cop numeric(14,2),
  borrador_precio_usd numeric(14,2),
  borrador_precio_eur numeric(14,2),
  borrador_limite_empleados integer,
  borrador_limite_calculos_mes integer,
  borrador_limite_informes_mes integer,
  tiene_borrador_sin_publicar boolean NOT NULL DEFAULT false,

  actualizado_at timestamptz NOT NULL DEFAULT now(),
  publicado_at timestamptz
);

CREATE TABLE IF NOT EXISTS empresas_negociaciones (
  empresa_id uuid PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
  precio_cop numeric(14,2) NOT NULL,
  precio_usd numeric(14,2) NOT NULL,
  precio_eur numeric(14,2) NOT NULL,
  limite_empleados integer,
  limite_calculos_mes integer,
  limite_informes_mes integer,
  notas text,
  creado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE config_planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas_negociaciones ENABLE ROW LEVEL SECURITY;

-- Lectura pública (la landing necesita mostrar precios sin sesión).
-- Escritura solo super_admin, siempre server-side con service role de todas
-- formas, esta policy es la segunda capa de defensa real.
DROP POLICY IF EXISTS "config_planes_lectura_publica" ON config_planes;
CREATE POLICY "config_planes_lectura_publica"
  ON config_planes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "config_planes_solo_super_admin_escribe" ON config_planes;
CREATE POLICY "config_planes_solo_super_admin_escribe"
  ON config_planes FOR ALL
  USING (get_my_rol() = 'super_admin')
  WITH CHECK (get_my_rol() = 'super_admin');

DROP POLICY IF EXISTS "empresas_negociaciones_solo_super_admin" ON empresas_negociaciones;
CREATE POLICY "empresas_negociaciones_solo_super_admin"
  ON empresas_negociaciones FOR ALL
  USING (get_my_rol() = 'super_admin')
  WITH CHECK (get_my_rol() = 'super_admin');

-- Semilla: los 4 planes, con los valores REALES que hoy están fijos en
-- código y en producción (src/lib/plan-limits.ts para límites, HEAD real
-- de src/lib/constants/pricing.ts para COP, el schema.org de page.tsx para
-- USD) — para que el cambio de fuente de verdad sea invisible el primer
-- día, nada cambia hasta que el super_admin publique algo distinto a
-- propósito. EUR no existía en ningún lado del código: sembrado como
-- estimado (USD * 0.92) a falta de un valor real, el super_admin debe
-- revisarlo y corregirlo desde el panel antes de confiar en él.
INSERT INTO config_planes (id, precio_cop, precio_usd, precio_eur, limite_empleados, limite_calculos_mes, limite_informes_mes)
VALUES
  ('free',      0,      0,  0,     1,    10,   0),
  ('lab',       49000,  12, 11.04, 5,    200,  5),
  ('impulso',   149000, 37, 34.04, 10,   200,  5),
  ('ilimitado', 349000, 87, 80.04, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
