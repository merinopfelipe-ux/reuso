-- Motor de precios configurable del Cotizador: transporte e IVA activables
-- por cotización (no aplican descuento), descuento por valor o porcentaje.
--
-- Fórmula (confirmada con el usuario):
--   transporte  = transporte_activo ? transporte_valor : 0
--   descuento$  = descuento_tipo = 'porcentaje' ? subtotal * descuento/100 : descuento
--   base_iva    = subtotal + transporte - descuento$
--   iva$        = iva_activo ? base_iva * iva_porcentaje/100 : 0
--   total       = base_iva + iva$
--
-- El transporte "se reparte entre los ítems" (para que no se vea como cobro
-- aparte) es SOLO visual, al mostrar el desglose por ítem — nunca se guarda
-- en crm_muebles_cotizados.precio_mueble, eso se calcula en el frontend.

ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS transporte_activo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transporte_valor  numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_activo        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iva_porcentaje    numeric(5,2) NOT NULL DEFAULT 19,
  ADD COLUMN IF NOT EXISTS descuento_tipo    text NOT NULL DEFAULT 'valor'
                             CHECK (descuento_tipo IN ('valor', 'porcentaje'));

-- Reemplaza la función existente (migración 026) — mismo nombre y firma,
-- ahora con la fórmula completa en vez de solo "subtotal - descuento".
CREATE OR REPLACE FUNCTION recalcular_totales_cotizacion(p_cotizacion_id UUID)
RETURNS TABLE(
  subtotal             NUMERIC,
  total                NUMERIC,
  co2_evitado_total_kg NUMERIC,
  agua_evitada_total_l NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subtotal          numeric;
  v_transporte_activo boolean;
  v_transporte_valor  numeric;
  v_descuento         numeric;
  v_descuento_tipo    text;
  v_iva_activo        boolean;
  v_iva_porcentaje    numeric;
  v_transporte        numeric;
  v_descuento_monto   numeric;
  v_base_iva          numeric;
  v_iva_monto         numeric;
  v_total             numeric;
BEGIN
  SELECT COALESCE(SUM(m.precio_mueble), 0)
    INTO v_subtotal
    FROM crm_muebles_cotizados m
    WHERE m.cotizacion_id = p_cotizacion_id;

  SELECT transporte_activo, transporte_valor, descuento, descuento_tipo, iva_activo, iva_porcentaje
    INTO v_transporte_activo, v_transporte_valor, v_descuento, v_descuento_tipo, v_iva_activo, v_iva_porcentaje
    FROM crm_cotizaciones
    WHERE id = p_cotizacion_id;

  v_transporte      := CASE WHEN v_transporte_activo THEN COALESCE(v_transporte_valor, 0) ELSE 0 END;
  v_descuento_monto := CASE WHEN v_descuento_tipo = 'porcentaje' THEN v_subtotal * COALESCE(v_descuento, 0) / 100 ELSE COALESCE(v_descuento, 0) END;
  v_base_iva        := v_subtotal + v_transporte - v_descuento_monto;
  v_iva_monto       := CASE WHEN v_iva_activo THEN v_base_iva * COALESCE(v_iva_porcentaje, 0) / 100 ELSE 0 END;
  v_total           := GREATEST(0, v_base_iva + v_iva_monto);

  UPDATE crm_cotizaciones c SET
    subtotal              = v_subtotal,
    co2_evitado_total_kg  = COALESCE((SELECT SUM(m.co2_evitado_kg) FROM crm_muebles_cotizados m WHERE m.cotizacion_id = p_cotizacion_id), 0),
    agua_evitada_total_l  = COALESCE((SELECT SUM(m.agua_evitada_l) FROM crm_muebles_cotizados m WHERE m.cotizacion_id = p_cotizacion_id), 0),
    total                 = v_total,
    updated_at            = NOW()
  WHERE c.id = p_cotizacion_id;

  RETURN QUERY
    SELECT c.subtotal, c.total, c.co2_evitado_total_kg, c.agua_evitada_total_l
    FROM crm_cotizaciones c
    WHERE c.id = p_cotizacion_id;
END;
$$;
