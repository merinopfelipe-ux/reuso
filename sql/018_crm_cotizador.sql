-- ============================================================
-- Migración 018 — CRM Cotizador Inteligente
-- Reúso V14.8 · Grupo MLP S.A.S
-- Ejecutar en Supabase SQL Editor
-- Tablas existentes: NO SE TOCAN
-- ============================================================

-- ─── A. EXTENSIÓN PGVECTOR ───────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;

-- ─── B. COLUMNA NUEVA EN empresas ────────────────────────────

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS tiene_cotizador BOOLEAN DEFAULT FALSE;

-- ─── C. TABLA: crm_clientes ──────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_clientes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo           TEXT CHECK (tipo IN ('persona', 'empresa')),
  nombre         TEXT NOT NULL,
  identificacion TEXT,
  telefono       TEXT,
  email          TEXT,
  ciudad         TEXT,
  notas          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── D. TABLA: crm_cotizaciones ──────────────────────────────

CREATE TABLE IF NOT EXISTS crm_cotizaciones (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id             UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id             UUID REFERENCES crm_clientes(id),
  asesor_id              UUID REFERENCES profiles(id),
  codigo_cotizacion      TEXT UNIQUE NOT NULL,
  estado                 TEXT NOT NULL DEFAULT 'por_cotizar'
                           CHECK (estado IN (
                             'por_cotizar',
                             'enviada',
                             'en_negociacion',
                             'esperando_anticipo',
                             'cerrado_ganado',
                             'cerrado_perdido',
                             'cerrado_inviable'
                           )),
  subtotal               DECIMAL(14,2) NOT NULL DEFAULT 0,
  descuento              DECIMAL(14,2) NOT NULL DEFAULT 0,
  total                  DECIMAL(14,2) NOT NULL DEFAULT 0,
  co2_evitado_total_kg   DECIMAL(12,4) NOT NULL DEFAULT 0,
  agua_evitada_total_l   DECIMAL(12,2) NOT NULL DEFAULT 0,
  observaciones          TEXT,
  enlace_publico_token   TEXT UNIQUE,
  fecha_enviada          TIMESTAMPTZ,
  fecha_apertura_cliente TIMESTAMPTZ,
  veces_abierta          INTEGER NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── E. TABLA: crm_muebles_cotizados ─────────────────────────

CREATE TABLE IF NOT EXISTS crm_muebles_cotizados (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id        UUID NOT NULL REFERENCES crm_cotizaciones(id) ON DELETE CASCADE,
  empresa_id           UUID REFERENCES empresas(id),
  imagen_url           TEXT,
  diagnostico_ia_json  JSONB,
  es_viable            BOOLEAN,
  categoria            TEXT,
  tipo_mueble          TEXT,
  oficios_json         JSONB,
  ajustes_humanos_json JSONB,
  peso_estandar_kg     DECIMAL(10,3),
  precio_mueble        DECIMAL(14,2),
  co2_evitado_kg       DECIMAL(12,4),
  agua_evitada_l       DECIMAL(12,2),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── F. TABLA: ia_memoria_visual ─────────────────────────────

CREATE TABLE IF NOT EXISTS ia_memoria_visual (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id                    UUID REFERENCES empresas(id),
  imagen_url                    TEXT,
  embedding                     vector(768),
  diagnostico_ia_original_json  JSONB,
  diagnostico_final_humano_json JSONB,
  fue_corregido                 BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── G. TABLA: crm_config_costos ─────────────────────────────

CREATE TABLE IF NOT EXISTS crm_config_costos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id         UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_mueble        TEXT,
  peso_estandar_kg   DECIMAL(10,3),
  precio_tapiceria   DECIMAL(14,2),
  precio_pintura     DECIMAL(14,2),
  precio_carpinteria DECIMAL(14,2),
  factor_co2_kg      DECIMAL(12,4),
  factor_agua_l      DECIMAL(12,4),
  activo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── H. ÍNDICES ──────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_cotizaciones_codigo
  ON crm_cotizaciones(codigo_cotizacion);

CREATE INDEX IF NOT EXISTS idx_crm_cotizaciones_empresa_estado
  ON crm_cotizaciones(empresa_id, estado);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_cotizaciones_token
  ON crm_cotizaciones(enlace_publico_token)
  WHERE enlace_publico_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_muebles_cotizacion
  ON crm_muebles_cotizados(cotizacion_id);

CREATE INDEX IF NOT EXISTS idx_crm_clientes_empresa
  ON crm_clientes(empresa_id);

CREATE INDEX IF NOT EXISTS idx_crm_config_costos_empresa
  ON crm_config_costos(empresa_id, activo);

CREATE INDEX IF NOT EXISTS idx_ia_memoria_visual_embedding
  ON ia_memoria_visual
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─── I. TRIGGERS updated_at ──────────────────────────────────

DROP TRIGGER IF EXISTS trg_crm_clientes_updated_at ON crm_clientes;
CREATE TRIGGER trg_crm_clientes_updated_at
  BEFORE UPDATE ON crm_clientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_crm_cotizaciones_updated_at ON crm_cotizaciones;
CREATE TRIGGER trg_crm_cotizaciones_updated_at
  BEFORE UPDATE ON crm_cotizaciones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── J. HABILITAR RLS ────────────────────────────────────────

ALTER TABLE crm_clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_cotizaciones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_muebles_cotizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_memoria_visual     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_config_costos     ENABLE ROW LEVEL SECURITY;

-- ─── K. POLÍTICAS RLS: crm_clientes ──────────────────────────

CREATE POLICY "crm_clientes_super_admin"
  ON crm_clientes FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "crm_clientes_empresa_admin"
  ON crm_clientes FOR ALL
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

CREATE POLICY "crm_clientes_empleado_read"
  ON crm_clientes FOR SELECT
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "crm_clientes_empleado_write"
  ON crm_clientes FOR INSERT
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "crm_clientes_empleado_update"
  ON crm_clientes FOR UPDATE
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

-- ─── L. POLÍTICAS RLS: crm_cotizaciones ──────────────────────

CREATE POLICY "crm_cotizaciones_super_admin"
  ON crm_cotizaciones FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "crm_cotizaciones_empresa_admin"
  ON crm_cotizaciones FOR ALL
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

CREATE POLICY "crm_cotizaciones_empleado_read"
  ON crm_cotizaciones FOR SELECT
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "crm_cotizaciones_empleado_write"
  ON crm_cotizaciones FOR INSERT
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "crm_cotizaciones_empleado_update"
  ON crm_cotizaciones FOR UPDATE
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "crm_cotizaciones_publico_token"
  ON crm_cotizaciones FOR SELECT
  USING (enlace_publico_token IS NOT NULL);

-- ─── M. POLÍTICAS RLS: crm_muebles_cotizados ─────────────────

CREATE POLICY "crm_muebles_super_admin"
  ON crm_muebles_cotizados FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "crm_muebles_empresa_admin"
  ON crm_muebles_cotizados FOR ALL
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

CREATE POLICY "crm_muebles_empleado_read"
  ON crm_muebles_cotizados FOR SELECT
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "crm_muebles_empleado_write"
  ON crm_muebles_cotizados FOR INSERT
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "crm_muebles_empleado_update"
  ON crm_muebles_cotizados FOR UPDATE
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "crm_muebles_publico_cotizacion"
  ON crm_muebles_cotizados FOR SELECT
  USING (
    cotizacion_id IN (
      SELECT id FROM crm_cotizaciones
      WHERE enlace_publico_token IS NOT NULL
    )
  );

-- ─── N. POLÍTICAS RLS: ia_memoria_visual ─────────────────────

CREATE POLICY "ia_memoria_super_admin"
  ON ia_memoria_visual FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "ia_memoria_empresa_admin"
  ON ia_memoria_visual FOR ALL
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

CREATE POLICY "ia_memoria_empleado_read"
  ON ia_memoria_visual FOR SELECT
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "ia_memoria_empleado_write"
  ON ia_memoria_visual FOR INSERT
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

-- ─── O. POLÍTICAS RLS: crm_config_costos ─────────────────────

CREATE POLICY "crm_config_super_admin"
  ON crm_config_costos FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "crm_config_empresa_admin"
  ON crm_config_costos FOR ALL
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

CREATE POLICY "crm_config_empleado_read"
  ON crm_config_costos FOR SELECT
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

-- ─── FIN 018 ─────────────────────────────────────────────────
