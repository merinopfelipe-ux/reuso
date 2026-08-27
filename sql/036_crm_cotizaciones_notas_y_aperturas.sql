-- Rediseño del Cotizador: trazabilidad real. Hasta hoy `veces_abierta`/
-- `fecha_apertura_cliente` en crm_cotizaciones se sobrescriben en cada visita
-- (sin historial). crm_cotizaciones_aperturas guarda una fila POR apertura
-- (mismo patrón que dpp_verificaciones). crm_cotizaciones_notas es el hilo de
-- comentarios internos del vendedor, visible solo para su empresa — mismo
-- patrón que tickets_mensajes: el autor SIEMPRE se captura server-side.

CREATE TABLE IF NOT EXISTS crm_cotizaciones_notas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id  uuid NOT NULL REFERENCES crm_cotizaciones(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id),
  nota           text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_cotizaciones_notas_cotizacion ON crm_cotizaciones_notas(cotizacion_id);

CREATE TABLE IF NOT EXISTS crm_cotizaciones_aperturas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id  uuid NOT NULL REFERENCES crm_cotizaciones(id) ON DELETE CASCADE,
  ip_address     text,
  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_cotizaciones_aperturas_cotizacion ON crm_cotizaciones_aperturas(cotizacion_id);

ALTER TABLE crm_cotizaciones_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_cotizaciones_aperturas ENABLE ROW LEVEL SECURITY;

-- Notas: solo super_admin o la empresa dueña de la cotización (vendedor) lee/escribe.
CREATE POLICY "crm_cotizaciones_notas_super_admin"
  ON crm_cotizaciones_notas FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "crm_cotizaciones_notas_empresa"
  ON crm_cotizaciones_notas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM crm_cotizaciones c
      WHERE c.id = crm_cotizaciones_notas.cotizacion_id
        AND c.empresa_id = get_my_empresa_id()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM crm_cotizaciones c
      WHERE c.id = crm_cotizaciones_notas.cotizacion_id
        AND c.empresa_id = get_my_empresa_id()
    )
  );

-- Aperturas: INSERT público sin auth (lo hace la página pública /cot/[token]);
-- SELECT solo super_admin o la empresa dueña.
CREATE POLICY "crm_cotizaciones_aperturas_insert_publico"
  ON crm_cotizaciones_aperturas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "crm_cotizaciones_aperturas_super_admin_read"
  ON crm_cotizaciones_aperturas FOR SELECT
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "crm_cotizaciones_aperturas_empresa_read"
  ON crm_cotizaciones_aperturas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crm_cotizaciones c
      WHERE c.id = crm_cotizaciones_aperturas.cotizacion_id
        AND c.empresa_id = get_my_empresa_id()
    )
  );
