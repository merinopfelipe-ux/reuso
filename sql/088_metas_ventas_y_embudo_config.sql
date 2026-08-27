-- 088_metas_ventas_y_embudo_config.sql
-- Meta de ventas del Cotizador + personalización visual del embudo
-- (renombrar/recolorear etapas — nunca cambia los `estado` reales de
-- crm_cotizaciones, solo cómo se muestran en el dashboard).

CREATE TABLE IF NOT EXISTS crm_metas_ventas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    valor numeric NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('mensual', 'anual')),
    vigencia_anio integer NOT NULL,
    vigencia_mes integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(empresa_id, vigencia_anio, vigencia_mes)
);

ALTER TABLE crm_metas_ventas ENABLE ROW LEVEL SECURITY;

-- Mismo patrón real ya usado en crm_clientes/crm_cotizaciones
-- (sql/018_crm_cotizador.sql) — get_my_rol()/get_my_empresa_id(), nunca
-- auth.jwt() directo ni una tabla "perfiles" que no existe en este proyecto
-- (la tabla real es profiles).
CREATE POLICY "crm_metas_ventas_super_admin"
  ON crm_metas_ventas FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "crm_metas_ventas_empresa_admin"
  ON crm_metas_ventas FOR ALL
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

CREATE POLICY "crm_metas_ventas_empleado_read"
  ON crm_metas_ventas FOR SELECT
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "crm_metas_ventas_empleado_write"
  ON crm_metas_ventas FOR INSERT
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "crm_metas_ventas_empleado_update"
  ON crm_metas_ventas FOR UPDATE
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS embudo_config jsonb;
