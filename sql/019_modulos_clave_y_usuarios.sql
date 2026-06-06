-- ============================================================
-- Migración 019 — Clave en módulos + módulos por usuario
-- Reúso V14.8 · Grupo MLP S.A.S
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── A. Columna 'clave' en modulos ────────────────────────────────────────────
-- Identificador único de texto para referenciar módulos en código sin depender de UUID

ALTER TABLE modulos
  ADD COLUMN IF NOT EXISTS clave TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_modulos_clave ON modulos(clave)
  WHERE clave IS NOT NULL;

-- ─── B. Registro del módulo Cotizador CRM ────────────────────────────────────

INSERT INTO modulos (clave, nombre, icono_lucide, descripcion, activo, orden)
VALUES (
  'cotizador_crm',
  'Cotizador CRM',
  'Calculator',
  'Cotizaciones con diagnóstico visual IA y seguimiento de embudo comercial.',
  true,
  10
)
ON CONFLICT DO NOTHING;

-- Actualiza si ya existe con ese nombre pero sin clave
UPDATE modulos
  SET clave = 'cotizador_crm'
  WHERE nombre = 'Cotizador CRM' AND clave IS NULL;

-- ─── C. Tabla modulos_usuarios ────────────────────────────────────────────────
-- empresa_admin asigna acceso a módulos por usuario dentro de su empresa

CREATE TABLE IF NOT EXISTS modulos_usuarios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,            -- auth.uid() / profiles.user_id
  modulo_id    UUID NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  empresa_id   UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  asignado_por UUID,                     -- user_id del empresa_admin que lo asignó
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, modulo_id, empresa_id)
);

-- ─── D. RLS modulos_usuarios ──────────────────────────────────────────────────

ALTER TABLE modulos_usuarios ENABLE ROW LEVEL SECURITY;

-- El propio usuario puede leer su asignación
CREATE POLICY "Usuario lee sus módulos"
  ON modulos_usuarios FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- empresa_admin gestiona los de su empresa
CREATE POLICY "Empresa admin gestiona modulos de su empresa"
  ON modulos_usuarios FOR ALL
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles
      WHERE user_id = auth.uid() AND rol = 'empresa_admin'
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles
      WHERE user_id = auth.uid() AND rol = 'empresa_admin'
    )
  );

-- super_admin todo
CREATE POLICY "Super admin gestiona todos los modulos_usuarios"
  ON modulos_usuarios FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin')
  );

-- ─── E. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_modulos_usuarios_user     ON modulos_usuarios(user_id);
CREATE INDEX IF NOT EXISTS idx_modulos_usuarios_empresa  ON modulos_usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_modulos_usuarios_modulo   ON modulos_usuarios(modulo_id);
