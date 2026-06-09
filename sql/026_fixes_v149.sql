-- Migración 026: fixes V14.9
-- 1. Función atómica para recalcular totales de cotización (evita race condition)
-- 2. CASCADE en dpp_documentos_ingesta y dpp_ciclos

-- ─── 1. Función recalcular_totales_cotizacion ────────────────────────────────

CREATE OR REPLACE FUNCTION recalcular_totales_cotizacion(p_cotizacion_id UUID)
RETURNS TABLE(
  subtotal            NUMERIC,
  total               NUMERIC,
  co2_evitado_total_kg NUMERIC,
  agua_evitada_total_l NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE crm_cotizaciones c SET
    subtotal              = COALESCE((SELECT SUM(m.precio_mueble)   FROM crm_muebles_cotizados m WHERE m.cotizacion_id = p_cotizacion_id), 0),
    co2_evitado_total_kg  = COALESCE((SELECT SUM(m.co2_evitado_kg)  FROM crm_muebles_cotizados m WHERE m.cotizacion_id = p_cotizacion_id), 0),
    agua_evitada_total_l  = COALESCE((SELECT SUM(m.agua_evitada_l)  FROM crm_muebles_cotizados m WHERE m.cotizacion_id = p_cotizacion_id), 0),
    total                 = GREATEST(
                              0,
                              COALESCE((SELECT SUM(m.precio_mueble) FROM crm_muebles_cotizados m WHERE m.cotizacion_id = p_cotizacion_id), 0)
                              - COALESCE(c.descuento, 0)
                            ),
    updated_at            = NOW()
  WHERE c.id = p_cotizacion_id;

  RETURN QUERY
    SELECT c.subtotal, c.total, c.co2_evitado_total_kg, c.agua_evitada_total_l
    FROM crm_cotizaciones c
    WHERE c.id = p_cotizacion_id;
END;
$$;

-- ─── 2. CASCADE en tablas DPP ────────────────────────────────────────────────

ALTER TABLE dpp_documentos_ingesta
  DROP CONSTRAINT IF EXISTS dpp_documentos_ingesta_activo_id_fkey,
  ADD CONSTRAINT dpp_documentos_ingesta_activo_id_fkey
    FOREIGN KEY (activo_id) REFERENCES dpp_activos(id) ON DELETE CASCADE;

ALTER TABLE dpp_ciclos
  DROP CONSTRAINT IF EXISTS dpp_ciclos_activo_id_fkey,
  ADD CONSTRAINT dpp_ciclos_activo_id_fkey
    FOREIGN KEY (activo_id) REFERENCES dpp_activos(id) ON DELETE CASCADE;

ALTER TABLE dpp_metricas_financieras
  DROP CONSTRAINT IF EXISTS dpp_metricas_financieras_activo_id_fkey,
  ADD CONSTRAINT dpp_metricas_financieras_activo_id_fkey
    FOREIGN KEY (activo_id) REFERENCES dpp_activos(id) ON DELETE CASCADE;
