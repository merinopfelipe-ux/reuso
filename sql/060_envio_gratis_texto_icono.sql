-- "Recogemos y entregamos gratis" es un mensaje aparte de "Mensajes
-- destacados" (destacados_json, migración 058): tiene su propia ubicación
-- fija en la cotización pública (debajo del total de Inversión en galería,
-- después de Nota en lista), mientras que Mensajes destacados es una lista
-- común que va al final, debajo de todo lo demás. envio_gratis_activo ya
-- existe desde la migración 057 — aquí solo se agrega texto e ícono, ambos
-- editables por el vendedor.
ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS envio_gratis_texto text,
  ADD COLUMN IF NOT EXISTS envio_gratis_icono text;
