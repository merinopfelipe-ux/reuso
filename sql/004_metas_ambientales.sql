-- ============================================================
-- Calculadora de Reúso — Schema Bloque 6 (Metas y Seguridad)
-- ============================================================

-- ─── 1. TABLA METAS AMBIENTALES ──────────────────────────────
CREATE TABLE IF NOT EXISTS metas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  titulo         text NOT NULL,
  descripcion    text,
  metrica        text NOT NULL CHECK (metrica IN ('co2_kg', 'peso_kg', 'agua_l', 'num_calculos')),
  valor_objetivo numeric NOT NULL,
  fecha_inicio   date NOT NULL,
  fecha_fin      date NOT NULL,
  activa         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

-- Super Admin todo
DROP POLICY IF EXISTS "metas_super_admin" ON metas;
CREATE POLICY "metas_super_admin" ON metas 
  FOR ALL USING (get_my_rol() = 'super_admin');

-- Las empresas (empleados o admin de dicha empresa) pueden ver las metas
DROP POLICY IF EXISTS "metas_empresa_read" ON metas;
CREATE POLICY "metas_empresa_read" ON metas 
  FOR SELECT 
  USING (empresa_id = get_my_empresa_id());

-- Solo el empresa_admin puede insertar/modificar metas de su empresa
DROP POLICY IF EXISTS "metas_empresa_admin_write" ON metas;
CREATE POLICY "metas_empresa_admin_write" ON metas 
  FOR ALL 
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');


-- ─── 2. SEGURIDAD DE CERTIFICADOS (CRIPTOGRAFÍA) ──────────────

-- Añadimos la columna para el Hash Inmutable
ALTER TABLE certificados ADD COLUMN IF NOT EXISTS hash_integridad text UNIQUE;

-- Aseguramos que los documentos puedan ser invalidados o marcados como fraudulentos a futuro
ALTER TABLE certificados ADD COLUMN IF NOT EXISTS revocado boolean DEFAULT false;
ALTER TABLE certificados ADD COLUMN IF NOT EXISTS motivo_revocacion text;
ALTER TABLE certificados ADD COLUMN IF NOT EXISTS revocado_por uuid REFERENCES auth.users(id);
ALTER TABLE certificados ADD COLUMN IF NOT EXISTS revocado_en timestamptz;
