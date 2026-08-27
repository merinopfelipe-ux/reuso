-- 093_cotizaciones_ultima_apertura.sql
-- fecha_apertura_cliente ya existe pero solo guarda la PRIMERA apertura
-- (usada por sales-dashboard.tsx para "horas promedio hasta la apertura",
-- un tiempo de respuesta que no debe recalcularse con cada reapertura).
-- Esta columna nueva sí se actualiza en cada apertura — es la que se
-- muestra en la lista de cotizaciones como "fecha de apertura más reciente".

ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS fecha_ultima_apertura_cliente timestamptz;

-- Backfill: para cotizaciones que ya tienen aperturas registradas, la
-- última apertura real conocida hasta hoy es el mayor created_at en
-- crm_cotizaciones_aperturas (si no hay ninguna fila ahí, cae al valor ya
-- existente de fecha_apertura_cliente como mejor aproximación disponible).
UPDATE crm_cotizaciones c
SET fecha_ultima_apertura_cliente = COALESCE(
  (SELECT MAX(a.created_at) FROM crm_cotizaciones_aperturas a WHERE a.cotizacion_id = c.id),
  c.fecha_apertura_cliente
)
WHERE fecha_ultima_apertura_cliente IS NULL;
