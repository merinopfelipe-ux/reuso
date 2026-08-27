-- "Forma de pago" (anticipo) pasa a ser configurable por cotización, mismo
-- patrón que transporte/IVA/descuento/validez: un switch + un valor. Antes
-- el 60% era una constante fija en código (src/lib/cotizador/precio.ts).
ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS anticipo_activo     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS anticipo_porcentaje numeric(5,2) NOT NULL DEFAULT 60;
