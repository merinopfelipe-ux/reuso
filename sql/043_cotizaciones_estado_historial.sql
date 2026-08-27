-- Historial real de cambios de estado del embudo — hasta hoy solo se veía
-- el estado actual (crm_cotizaciones.estado) y su última fecha de
-- actualización, sin rastro de por cuáles estados pasó antes. Una fila por
-- cada cambio, mismo patrón que crm_cotizaciones_aperturas (migración 036).

CREATE TABLE IF NOT EXISTS crm_cotizaciones_estado_historial (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id   uuid NOT NULL REFERENCES crm_cotizaciones(id) ON DELETE CASCADE,
  estado_anterior text,
  estado_nuevo    text NOT NULL,
  user_id         uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_cotizaciones_estado_historial_cotizacion
  ON crm_cotizaciones_estado_historial(cotizacion_id);

ALTER TABLE crm_cotizaciones_estado_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_cotizaciones_estado_historial_super_admin"
  ON crm_cotizaciones_estado_historial FOR ALL
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "crm_cotizaciones_estado_historial_empresa_read"
  ON crm_cotizaciones_estado_historial FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crm_cotizaciones c
      WHERE c.id = crm_cotizaciones_estado_historial.cotizacion_id
        AND c.empresa_id = get_my_empresa_id()
    )
  );
