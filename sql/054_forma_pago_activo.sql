-- "Forma de pago" en Detalles pasa a ser colapsable como todo lo demás: un
-- switch que decide si se muestra o no en la cotización pública (Nota y
-- Garantía ya se pueden "apagar" dejándolas vacías, pero Forma de pago
-- siempre tiene un valor por defecto — necesita su propio switch).
ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS forma_pago_activo boolean NOT NULL DEFAULT true;
