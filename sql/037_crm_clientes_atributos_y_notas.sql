-- Rediseño del Cotizador — expansión del CRM general de clientes:
-- (a) atributos personalizados key-value flexibles, sin alterar el esquema
--     central cada vez que un vendedor necesita guardar un dato imprevisto;
-- (b) bitácora general del cliente, INDEPENDIENTE de crm_cotizaciones_notas
--     (migración 036) — esta vive más allá de una sola cotización.

CREATE TABLE IF NOT EXISTS crm_clientes_atributos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid NOT NULL REFERENCES crm_clientes(id) ON DELETE CASCADE,
  clave       text NOT NULL,
  valor       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, clave)
);

CREATE TABLE IF NOT EXISTS crm_clientes_notas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid NOT NULL REFERENCES crm_clientes(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  nota        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_clientes_notas_cliente ON crm_clientes_notas(cliente_id);

CREATE OR REPLACE FUNCTION set_updated_at_crm_clientes_atributos()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_clientes_atributos_updated_at ON crm_clientes_atributos;
CREATE TRIGGER trg_crm_clientes_atributos_updated_at
  BEFORE UPDATE ON crm_clientes_atributos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_crm_clientes_atributos();

ALTER TABLE crm_clientes_atributos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_clientes_notas ENABLE ROW LEVEL SECURITY;

-- Mismo alcance que crm_clientes: solo la empresa dueña del cliente (vía join) o super_admin.
CREATE POLICY "crm_clientes_atributos_super_admin"
  ON crm_clientes_atributos FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "crm_clientes_atributos_empresa"
  ON crm_clientes_atributos FOR ALL
  USING (
    EXISTS (SELECT 1 FROM crm_clientes c WHERE c.id = crm_clientes_atributos.cliente_id AND c.empresa_id = get_my_empresa_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM crm_clientes c WHERE c.id = crm_clientes_atributos.cliente_id AND c.empresa_id = get_my_empresa_id())
  );

CREATE POLICY "crm_clientes_notas_super_admin"
  ON crm_clientes_notas FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "crm_clientes_notas_empresa"
  ON crm_clientes_notas FOR ALL
  USING (
    EXISTS (SELECT 1 FROM crm_clientes c WHERE c.id = crm_clientes_notas.cliente_id AND c.empresa_id = get_my_empresa_id())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM crm_clientes c WHERE c.id = crm_clientes_notas.cliente_id AND c.empresa_id = get_my_empresa_id())
  );
