-- Trazabilidad de descargas del PDF de la cotización — reutiliza la misma
-- tabla de aperturas (mismo tipo de evento: visita al enlace público), solo
-- se distingue con `tipo` para que el vendedor vea en una sola línea de
-- tiempo tanto las aperturas como las descargas, con los mismos datos
-- (dispositivo, ubicación, hora) que ya se capturan para las aperturas.

ALTER TABLE crm_cotizaciones_aperturas
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'apertura';

ALTER TABLE crm_cotizaciones_aperturas
  DROP CONSTRAINT IF EXISTS crm_cotizaciones_aperturas_tipo_check;

ALTER TABLE crm_cotizaciones_aperturas
  ADD CONSTRAINT crm_cotizaciones_aperturas_tipo_check CHECK (tipo IN ('apertura', 'descarga'));
