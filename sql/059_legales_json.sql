-- Textos legales de la cotización pública: lista libre de párrafos cortos
-- (ej. "Los precios no incluyen instalación eléctrica.") que el vendedor
-- agrega/edita/quita desde el editor, sin ícono ni formato especial —
-- aparecen antes del pie de página, en gris, iguales en ambas vistas.
ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS legales_json jsonb NOT NULL DEFAULT '[]'::jsonb;
