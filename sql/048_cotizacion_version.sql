-- "Versión N.º" — cuántas veces ha sido modificada la cotización de verdad
-- (precio, ítems, estado, cliente, observaciones), NUNCA por aperturas del
-- cliente en la propuesta pública (veces_abierta/fecha_apertura_cliente no
-- cuentan como versión).
--
-- Un trigger en vez de incrementar el contador a mano en cada ruta: cubre
-- automáticamente todos los puntos de escritura existentes (PATCH de la
-- cotización, agregar/editar mueble vía recalcular_totales_cotizacion,
-- /enviar, /aceptar) y cualquiera que se agregue después, sin tener que
-- acordarse de repetir la lógica en cada uno.

ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION incrementar_version_cotizacion()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.estado             IS DISTINCT FROM OLD.estado OR
    NEW.descuento          IS DISTINCT FROM OLD.descuento OR
    NEW.descuento_tipo     IS DISTINCT FROM OLD.descuento_tipo OR
    NEW.transporte_activo  IS DISTINCT FROM OLD.transporte_activo OR
    NEW.transporte_valor   IS DISTINCT FROM OLD.transporte_valor OR
    NEW.iva_activo         IS DISTINCT FROM OLD.iva_activo OR
    NEW.iva_porcentaje     IS DISTINCT FROM OLD.iva_porcentaje OR
    NEW.validez_activa     IS DISTINCT FROM OLD.validez_activa OR
    NEW.validez_dias       IS DISTINCT FROM OLD.validez_dias OR
    NEW.observaciones      IS DISTINCT FROM OLD.observaciones OR
    NEW.subtotal           IS DISTINCT FROM OLD.subtotal OR
    NEW.total              IS DISTINCT FROM OLD.total OR
    NEW.cliente_id         IS DISTINCT FROM OLD.cliente_id
  ) THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_incrementar_version_cotizacion ON crm_cotizaciones;
CREATE TRIGGER trg_incrementar_version_cotizacion
  BEFORE UPDATE ON crm_cotizaciones
  FOR EACH ROW
  EXECUTE FUNCTION incrementar_version_cotizacion();
