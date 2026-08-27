-- Corrige el alcance de "Versión N.º" (migración 048): solo cuenta cambios
-- reales de precio e ítems (descuento, transporte, IVA, subtotal, total).
-- Nunca cuenta estado, cliente, observaciones, validez ni aperturas del
-- cliente en la propuesta pública.

CREATE OR REPLACE FUNCTION incrementar_version_cotizacion()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.descuento          IS DISTINCT FROM OLD.descuento OR
    NEW.descuento_tipo     IS DISTINCT FROM OLD.descuento_tipo OR
    NEW.transporte_activo  IS DISTINCT FROM OLD.transporte_activo OR
    NEW.transporte_valor   IS DISTINCT FROM OLD.transporte_valor OR
    NEW.iva_activo         IS DISTINCT FROM OLD.iva_activo OR
    NEW.iva_porcentaje     IS DISTINCT FROM OLD.iva_porcentaje OR
    NEW.subtotal           IS DISTINCT FROM OLD.subtotal OR
    NEW.total              IS DISTINCT FROM OLD.total
  ) THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
