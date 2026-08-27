-- "Recogemos y entregamos gratis" deja de ser un mensaje fijo: el vendedor
-- puede escribir su propio texto y elegir el ícono (mismo selector de
-- src/components/admin/icon-picker.tsx, nombre de ícono Lucide como texto).
ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS envio_gratis_texto text,
  ADD COLUMN IF NOT EXISTS envio_gratis_icono text;
