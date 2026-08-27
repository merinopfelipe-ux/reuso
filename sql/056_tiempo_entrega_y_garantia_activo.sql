-- "Tiempo de la entrega" y "Garantía" pasan a ser colapsables como el resto
-- de Detalles (Validez, Forma de pago): un switch que decide si se muestran
-- o no en la cotización pública. Ambos siempre tienen un valor por defecto
-- (nunca están vacíos), así que necesitan su propio switch para poder
-- ocultarse — igual criterio que forma_pago_activo (migración 054).
ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS tiempo_entrega_activo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS garantia_activo boolean NOT NULL DEFAULT true;
