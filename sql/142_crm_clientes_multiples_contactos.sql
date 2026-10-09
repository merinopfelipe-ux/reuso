-- 142: CRM — múltiples teléfonos/correos por persona y múltiples nombres
-- comerciales por empresa. Atributos personalizados a nivel de empresa.
-- Expandir-contraer: solo ADD COLUMN IF NOT EXISTS y CREATE TABLE IF NOT EXISTS.
-- Corre en staging (rjcfqcqgqxoblisuyapq) primero, producción después.

-- ──────────────────────────────────────────────
-- 1. crm_clientes: teléfonos y correos adicionales
-- ──────────────────────────────────────────────
ALTER TABLE crm_clientes
  ADD COLUMN IF NOT EXISTS telefonos_extra jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS correos_extra   jsonb DEFAULT '[]'::jsonb NOT NULL;

-- ──────────────────────────────────────────────
-- 2. crm_empresas_clientes: varios nombres comerciales
-- ──────────────────────────────────────────────
ALTER TABLE crm_empresas_clientes
  ADD COLUMN IF NOT EXISTS nombres_comerciales jsonb DEFAULT '[]'::jsonb NOT NULL;

-- ──────────────────────────────────────────────
-- 3. Atributos de empresa (en vez de por persona)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_empresas_atributos (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_cliente_id uuid        NOT NULL REFERENCES crm_empresas_clientes(id) ON DELETE CASCADE,
  empresa_id         uuid        NOT NULL REFERENCES empresas(id)              ON DELETE CASCADE,
  clave              text        NOT NULL,
  valor              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_cliente_id, clave)
);

ALTER TABLE crm_empresas_atributos ENABLE ROW LEVEL SECURITY;

-- Solo la empresa dueña puede leer y escribir sus atributos de empresa-cliente
DROP POLICY IF EXISTS "empresa_lee_sus_atributos_empresa_cliente" ON crm_empresas_atributos;
CREATE POLICY "empresa_lee_sus_atributos_empresa_cliente"
  ON crm_empresas_atributos FOR ALL TO authenticated
  USING  (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- super_admin acceso total
DROP POLICY IF EXISTS "super_admin_atributos_empresa_cliente" ON crm_empresas_atributos;
CREATE POLICY "super_admin_atributos_empresa_cliente"
  ON crm_empresas_atributos FOR ALL TO authenticated
  USING  (get_my_rol() = 'super_admin')
  WITH CHECK (get_my_rol() = 'super_admin');
