-- Validez de la oferta: switch entre "días calendario" (ya existía) y
-- "fecha específica" (nueva). validez_modo decide cuál de las dos leer al
-- mostrar la fecha de vencimiento.
ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS validez_modo text NOT NULL DEFAULT 'dias',
  ADD COLUMN IF NOT EXISTS validez_fecha date;

ALTER TABLE crm_cotizaciones
  DROP CONSTRAINT IF EXISTS crm_cotizaciones_validez_modo_check;
ALTER TABLE crm_cotizaciones
  ADD CONSTRAINT crm_cotizaciones_validez_modo_check CHECK (validez_modo IN ('dias', 'fecha'));

-- Trazabilidad: registrar cuando se comparte la propuesta por WhatsApp o
-- correo desde el botón "Compartir" (antes solo se registraban aperturas y
-- descargas).
ALTER TABLE crm_cotizaciones_aperturas
  DROP CONSTRAINT IF EXISTS crm_cotizaciones_aperturas_tipo_check;
ALTER TABLE crm_cotizaciones_aperturas
  ADD CONSTRAINT crm_cotizaciones_aperturas_tipo_check
    CHECK (tipo IN ('apertura', 'descarga', 'compartido_whatsapp', 'compartido_correo'));
