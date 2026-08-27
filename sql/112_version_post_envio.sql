-- Modificar la función de versión para que NO cuente si la cotización
-- estaba en estado 'por_cotizar' (borrador). A partir de que se envía,
-- empieza a contar versiones.

CREATE OR REPLACE FUNCTION incrementar_version_cotizacion()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo incrementamos si hubo cambios relevantes EN PRECIO/CANTIDADES
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
    -- Y SOLO si la cotización ya superó la etapa inicial ('por_cotizar')
    IF OLD.estado != 'por_cotizar' THEN
      NEW.version := COALESCE(OLD.version, 1) + 1;
    ELSE
      -- Si estaba 'por_cotizar' (y quizá lo sigue estando o acaba de enviarse),
      -- se considera la versión inicial. No suma.
      NEW.version := COALESCE(OLD.version, 1);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
