-- sql/107_borrador_iniciado_at.sql
-- Marca el momento en que una cotización en borrador (estado 'por_cotizar')
-- recibió su primer ítem guardado — nunca se reescribe después. El cron
-- cotizador-purga-borradores-8h usa esta columna para borrar borradores
-- abandonados 8h después de ese momento, sin importar cuánto se sigan
-- editando otras cosas de la cotización mientras tanto (ver spec
-- 2026-08-25-cotizador-agregar-items-automatico-design.md, sección B).
ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS borrador_iniciado_at timestamptz;
