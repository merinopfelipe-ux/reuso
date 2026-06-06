-- ============================================================
-- Migración 017 — Pasaporte Digital de Producto (DPP)
-- Reúso V14.1 · Grupo MLP S.A.S
-- Ejecutar en Supabase SQL Editor
-- 16 tablas existentes: NO SE TOCAN
-- ============================================================

-- ─── A. COLUMNAS NUEVAS EN TABLAS EXISTENTES ────────────────

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS tiene_dpp        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sector_dpp       TEXT,
  ADD COLUMN IF NOT EXISTS moneda_preferida TEXT DEFAULT 'COP';

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS es_activo_circular BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vida_util_anos     DECIMAL(5,1),
  ADD COLUMN IF NOT EXISTS categoria_dpp      TEXT;

-- ─── B. TABLA: dpp_activos ───────────────────────────────────

CREATE TABLE IF NOT EXISTS dpp_activos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES profiles(id),
  codigo_dpp       TEXT UNIQUE NOT NULL,
  nombre           TEXT NOT NULL,
  descripcion      TEXT,
  categoria_id     UUID REFERENCES categorias(id),
  peso_total_kg    DECIMAL(12,3),
  composicion_json JSONB,
  estado           TEXT NOT NULL DEFAULT 'activo'
                     CHECK (estado IN ('activo','en_reuso','disposicion_final','archivado')),
  n_ciclos         INTEGER NOT NULL DEFAULT 0,
  imagen_url       TEXT,
  qr_url           TEXT,
  hash_integridad  TEXT,
  hash_previo      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── C. TABLA: dpp_ciclos ────────────────────────────────────

CREATE TABLE IF NOT EXISTS dpp_ciclos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id               UUID NOT NULL REFERENCES dpp_activos(id) ON DELETE CASCADE,
  empresa_id              UUID REFERENCES empresas(id),
  numero_ciclo            INTEGER NOT NULL,
  fecha_inicio            DATE,
  fecha_fin               DATE,
  descripcion             TEXT,
  operacion_realizada     TEXT,
  distancia_transporte_km DECIMAL(8,2) NOT NULL DEFAULT 0,
  co2_ciclo_kg            DECIMAL(12,4),
  co2_evitado_kg          DECIMAL(12,4),
  evidencia_json          JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── D. TABLA: dpp_metricas_financieras ─────────────────────

CREATE TABLE IF NOT EXISTS dpp_metricas_financieras (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id           UUID NOT NULL REFERENCES dpp_activos(id) ON DELETE CASCADE,
  empresa_id          UUID REFERENCES empresas(id),
  p_virgin_usd_kg     DECIMAL(12,4),
  q_circular_kg       DECIMAL(12,3),
  c_adquisicion       DECIMAL(14,2),
  c_operacion         DECIMAL(14,2),
  c_mantenimiento     DECIMAL(14,2),
  c_disposicion       DECIMAL(14,2),
  v_reventa           DECIMAL(14,2),
  m_secundario_kg     DECIMAL(12,3),
  m_renovable_kg      DECIMAL(12,3),
  m_total_input_kg    DECIMAL(12,3),
  tco                 DECIMAL(14,2) GENERATED ALWAYS AS (
                        COALESCE(c_adquisicion,0)
                        + COALESCE(c_operacion,0)
                        + COALESCE(c_mantenimiento,0)
                        + COALESCE(c_disposicion,0)
                        - COALESCE(v_reventa,0)
                      ) STORED,
  costo_evitado       DECIMAL(14,2),
  e_roi               DECIMAL(8,2),
  ice_porcentaje      DECIMAL(6,2),
  inflow_circular_pct DECIMAL(6,2),
  snapshot_json       JSONB,
  calculado_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version             TEXT
);

-- ─── E. TABLA: dpp_documentos_ingesta ───────────────────────

CREATE TABLE IF NOT EXISTS dpp_documentos_ingesta (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id            UUID REFERENCES dpp_activos(id),
  empresa_id           UUID REFERENCES empresas(id),
  user_id              UUID REFERENCES profiles(id),
  tipo                 TEXT CHECK (tipo IN (
                         'factura_compra','recibo_energia',
                         'certificado_origen','foto_objeto','otro'
                       )),
  archivo_url          TEXT,
  nombre_archivo       TEXT,
  estado_ocr           TEXT NOT NULL DEFAULT 'pendiente'
                         CHECK (estado_ocr IN ('pendiente','procesando','completado','error')),
  resultado_json       JSONB,
  datos_validados_json JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── F. TABLA: dpp_verificaciones ───────────────────────────

CREATE TABLE IF NOT EXISTS dpp_verificaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id   UUID REFERENCES dpp_activos(id),
  codigo_dpp  TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  pais        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── G. ÍNDICES ──────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_dpp_activos_codigo_dpp
  ON dpp_activos(codigo_dpp);

CREATE INDEX IF NOT EXISTS idx_dpp_activos_empresa_estado
  ON dpp_activos(empresa_id, estado);

CREATE INDEX IF NOT EXISTS idx_dpp_ciclos_activo
  ON dpp_ciclos(activo_id);

CREATE INDEX IF NOT EXISTS idx_dpp_metricas_activo
  ON dpp_metricas_financieras(activo_id);

CREATE INDEX IF NOT EXISTS idx_dpp_verificaciones_codigo_created
  ON dpp_verificaciones(codigo_dpp, created_at);

-- ─── H. TRIGGER updated_at para dpp_activos ─────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dpp_activos_updated_at ON dpp_activos;
CREATE TRIGGER trg_dpp_activos_updated_at
  BEFORE UPDATE ON dpp_activos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── I. HABILITAR RLS ────────────────────────────────────────

ALTER TABLE dpp_activos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpp_ciclos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpp_metricas_financieras ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpp_documentos_ingesta   ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpp_verificaciones       ENABLE ROW LEVEL SECURITY;

-- ─── J. POLÍTICAS RLS: dpp_activos ──────────────────────────

CREATE POLICY "dpp_activos_super_admin"
  ON dpp_activos FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "dpp_activos_empresa_admin"
  ON dpp_activos FOR ALL
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

CREATE POLICY "dpp_activos_empleado_read"
  ON dpp_activos FOR SELECT
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "dpp_activos_empleado_write"
  ON dpp_activos FOR INSERT
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "dpp_activos_empleado_update"
  ON dpp_activos FOR UPDATE
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "dpp_activos_usuario_libre"
  ON dpp_activos FOR SELECT
  USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
         AND get_my_rol() = 'usuario_libre');

-- ─── K. POLÍTICAS RLS: dpp_ciclos ───────────────────────────

CREATE POLICY "dpp_ciclos_super_admin"
  ON dpp_ciclos FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "dpp_ciclos_empresa_admin"
  ON dpp_ciclos FOR ALL
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

CREATE POLICY "dpp_ciclos_empleado_read"
  ON dpp_ciclos FOR SELECT
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "dpp_ciclos_empleado_write"
  ON dpp_ciclos FOR INSERT
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "dpp_ciclos_empleado_update"
  ON dpp_ciclos FOR UPDATE
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

-- ─── L. POLÍTICAS RLS: dpp_metricas_financieras ─────────────

CREATE POLICY "dpp_metricas_super_admin"
  ON dpp_metricas_financieras FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "dpp_metricas_empresa_admin"
  ON dpp_metricas_financieras FOR ALL
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

CREATE POLICY "dpp_metricas_empleado_read"
  ON dpp_metricas_financieras FOR SELECT
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

-- ─── M. POLÍTICAS RLS: dpp_documentos_ingesta ───────────────

CREATE POLICY "dpp_docs_super_admin"
  ON dpp_documentos_ingesta FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "dpp_docs_empresa_admin"
  ON dpp_documentos_ingesta FOR ALL
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

CREATE POLICY "dpp_docs_empleado_read"
  ON dpp_documentos_ingesta FOR SELECT
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "dpp_docs_empleado_write"
  ON dpp_documentos_ingesta FOR INSERT
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "dpp_docs_usuario_libre"
  ON dpp_documentos_ingesta FOR SELECT
  USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
         AND get_my_rol() = 'usuario_libre');

-- ─── N. POLÍTICAS RLS: dpp_verificaciones ───────────────────
-- INSERT público (para tracking de QR sin auth)
-- SELECT solo super_admin y empresa dueña (via activo_id JOIN)

CREATE POLICY "dpp_verif_insert_publico"
  ON dpp_verificaciones FOR INSERT
  WITH CHECK (true);

CREATE POLICY "dpp_verif_super_admin"
  ON dpp_verificaciones FOR SELECT
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "dpp_verif_empresa_owner"
  ON dpp_verificaciones FOR SELECT
  USING (
    activo_id IN (
      SELECT id FROM dpp_activos
      WHERE empresa_id = get_my_empresa_id()
    )
  );

-- ─── FIN 017 ─────────────────────────────────────────────────
