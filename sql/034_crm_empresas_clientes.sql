-- Rediseño del Cotizador: modelo "Empresa cliente + contactos".
-- Una empresa cliente B2B (identificada por NIT) puede tener varios contactos
-- (personas con celular) asociados. crm_clientes sigue siendo la tabla de
-- contactos/personas; un contacto sin empresa_cliente_id es un cliente B2C
-- normal. El celular es el eje de identificación (ver identificacion-cliente.tsx).

CREATE TABLE IF NOT EXISTS crm_empresas_clientes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nit               text NOT NULL,
  razon_social      text NOT NULL,
  nombre_comercial  text,
  direccion         text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_empresas_clientes_nit
  ON crm_empresas_clientes(empresa_id, nit);

ALTER TABLE crm_clientes
  ADD COLUMN IF NOT EXISTS empresa_cliente_id uuid REFERENCES crm_empresas_clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS apellido text,
  ADD COLUMN IF NOT EXISTS direccion text,
  ADD COLUMN IF NOT EXISTS telefono_indicativo text NOT NULL DEFAULT '+57';

-- Un mismo celular no se repite dos veces como contacto dentro de la misma
-- empresa usuaria del software (sí puede repetirse entre empresas distintas).
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_clientes_telefono
  ON crm_clientes(empresa_id, telefono_indicativo, telefono)
  WHERE telefono IS NOT NULL;

-- Trigger updated_at (mismo patrón que el resto del proyecto)
CREATE OR REPLACE FUNCTION set_updated_at_crm_empresas_clientes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_empresas_clientes_updated_at ON crm_empresas_clientes;
CREATE TRIGGER trg_crm_empresas_clientes_updated_at
  BEFORE UPDATE ON crm_empresas_clientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_crm_empresas_clientes();

-- RLS: mismo patrón de 5 policies ya usado en crm_clientes (sql/018).
ALTER TABLE crm_empresas_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_empresas_clientes_super_admin"
  ON crm_empresas_clientes FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "crm_empresas_clientes_empresa_admin"
  ON crm_empresas_clientes FOR ALL
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

CREATE POLICY "crm_empresas_clientes_empleado_read"
  ON crm_empresas_clientes FOR SELECT
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "crm_empresas_clientes_empleado_write"
  ON crm_empresas_clientes FOR INSERT
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');

CREATE POLICY "crm_empresas_clientes_empleado_update"
  ON crm_empresas_clientes FOR UPDATE
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado')
  WITH CHECK (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empleado');
