-- Columnas referenciadas en el backend (src/app/api/cotizador/cotizaciones/[id]/route.ts)
-- que aún no existían en la base de datos, causando "column does not exist"
-- al cargar cualquier cotización.
ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS forma_pago_tipo text NOT NULL DEFAULT 'anticipo',
  ADD COLUMN IF NOT EXISTS forma_pago_dias integer,
  ADD COLUMN IF NOT EXISTS tiempo_entrega  text,
  ADD COLUMN IF NOT EXISTS garantia        text;

ALTER TABLE crm_cotizaciones
  DROP CONSTRAINT IF EXISTS crm_cotizaciones_forma_pago_tipo_check;
ALTER TABLE crm_cotizaciones
  ADD CONSTRAINT crm_cotizaciones_forma_pago_tipo_check CHECK (forma_pago_tipo IN ('anticipo', 'dias'));
