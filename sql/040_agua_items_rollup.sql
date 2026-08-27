-- Rollup de agua por ítem (litros), gemelo de items.co2_por_unidad — cierra el
-- motor de la Calculadora general para que agua_total deje de derivarse del
-- CO2 y use litros reales por material (item_materiales.factor_agua_l_kg).
--
-- Requiere haber corrido sql/039_factor_agua_materiales.sql primero (siembra
-- los factores base) — si se corre antes, el backfill de abajo simplemente
-- da 0 y hay que repetirlo tras poblar los factores.
--
-- El Cotizador NO depende de esta columna: mueble/route.ts ya recalcula el
-- agua evitada en vivo desde item_materiales en cada cotización, así que su
-- dato ya es real sin necesitar este rollup.

ALTER TABLE items ADD COLUMN IF NOT EXISTS agua_por_unidad numeric(10,4) NOT NULL DEFAULT 0;

UPDATE items i
SET agua_por_unidad = sub.total_agua
FROM (
  SELECT item_id, SUM(peso_kg * COALESCE(factor_agua_l_kg, 0)) AS total_agua
  FROM item_materiales
  GROUP BY item_id
) sub
WHERE sub.item_id = i.id;
