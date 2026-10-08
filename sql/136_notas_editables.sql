-- Notas editables: añade editado_at a las tablas de notas de clientes y cotizaciones.
-- Las notas de leads usan un campo editadoEl dentro de su columna JSON (ver notas-lead.ts).
-- Expansión segura: ADD COLUMN IF NOT EXISTS no afecta filas existentes.

ALTER TABLE crm_clientes_notas
  ADD COLUMN IF NOT EXISTS editado_at timestamptz;

ALTER TABLE crm_cotizaciones_notas
  ADD COLUMN IF NOT EXISTS editado_at timestamptz;
