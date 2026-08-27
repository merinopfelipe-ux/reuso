-- Mensaje opcional "Recogemos y entregamos Gratis" en la propuesta pública —
-- distinto del aviso automático de transporte sin costo (que depende de
-- transporte_activo en Totales): este es un botón aparte en Detalles, que el
-- vendedor prende a mano cuando quiere destacarlo. Apagado por defecto.
ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS envio_gratis_activo boolean NOT NULL DEFAULT false;
