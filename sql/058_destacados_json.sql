-- "Recogemos y entregamos gratis" deja de ser un mensaje único y fijo: el
-- vendedor puede agregar tantos mensajes destacados como necesite, cada uno
-- con su propio ícono (nombre Lucide, mismo selector de
-- src/components/admin/icon-picker.tsx) y su propio texto libre.
-- Reemplaza el diseño de un solo campo de la migración 057
-- (envio_gratis_activo queda sin usar, no se elimina por seguridad de datos).
ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS destacados_json jsonb NOT NULL DEFAULT '[]'::jsonb;
