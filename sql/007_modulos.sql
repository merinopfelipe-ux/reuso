-- ============================================================
-- Calculadora de Reúso — Schema Bloque 8: Módulos comprables
-- ============================================================

-- 1. Tabla de módulos (análoga a categorías, pero a nivel de producto)
CREATE TABLE IF NOT EXISTS modulos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text NOT NULL,
  icono_lucide text NOT NULL DEFAULT 'Package',
  descripcion  text,
  activo       boolean DEFAULT true,
  orden        int DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- 2. Cada categoría pertenece a un módulo (opcional: NULL = sin módulo)
ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS modulo_id uuid REFERENCES modulos(id) ON DELETE SET NULL;

-- 3. Relación M2M empresa ↔ módulo
CREATE TABLE IF NOT EXISTS modulos_empresas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id   uuid NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  empresa_id  uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(modulo_id, empresa_id)
);

-- 4. RLS: módulos
ALTER TABLE modulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer módulos activos"
  ON modulos FOR SELECT
  USING (activo = true);

CREATE POLICY "Super admin gestiona módulos"
  ON modulos FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin')
  );

-- 5. RLS: modulos_empresas
ALTER TABLE modulos_empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa lee sus módulos asignados"
  ON modulos_empresas FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admin gestiona modulos_empresas"
  ON modulos_empresas FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin')
  );

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_modulos_empresas_empresa ON modulos_empresas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_modulos_empresas_modulo  ON modulos_empresas(modulo_id);
CREATE INDEX IF NOT EXISTS idx_categorias_modulo        ON categorias(modulo_id);
