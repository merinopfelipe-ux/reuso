-- Validez de la oferta — igual patrón que transporte/IVA (migración 044):
-- un toggle + un valor. Por defecto activa, 30 días calendario desde
-- created_at. La fecha de vencimiento se calcula al mostrarla (created_at +
-- validez_dias), nunca se guarda como columna aparte.

ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS validez_activa boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS validez_dias   integer NOT NULL DEFAULT 30;
