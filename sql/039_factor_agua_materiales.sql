-- Siembra el factor de agua (litros por kg) para los 8 materiales base del
-- catálogo, en item_materiales (ítems reales ya creados) y en
-- categoria_materiales_base (molde de categoría, pre-llena ítems futuros).
-- Valores exactos entregados por el usuario (2026-07-30). Match case-
-- insensitive por nombre para cubrir variantes de mayúsculas ya existentes
-- en el catálogo ("Espumas flexibles" vs "ESPUMAS FLEXIBLES", etc.).
--
-- Esta migración deja registrado en el repositorio lo que antes se aplicó
-- como una operación manual directa contra producción (vía script con la
-- service role key) — se ejecuta de nuevo aquí de forma idempotente (UPDATE
-- puro, sin efecto si el valor ya está puesto) para no perder trazabilidad.
--
-- Debe correr ANTES de sql/040_agua_items_rollup.sql, que calcula el rollup
-- items.agua_por_unidad a partir de estos mismos factores.

UPDATE item_materiales SET factor_agua_l_kg = 26.0   WHERE lower(trim(nombre)) = 'hierro';
UPDATE item_materiales SET factor_agua_l_kg = 46.0   WHERE lower(trim(nombre)) = 'acero';
UPDATE item_materiales SET factor_agua_l_kg = 199.0  WHERE lower(trim(nombre)) = 'polipropileno';
UPDATE item_materiales SET factor_agua_l_kg = 582.0  WHERE lower(trim(nombre)) = 'espumas rígidas';
UPDATE item_materiales SET factor_agua_l_kg = 362.5  WHERE lower(trim(nombre)) = 'espumas flexibles';
UPDATE item_materiales SET factor_agua_l_kg = 625.0  WHERE lower(trim(nombre)) = 'madera dura';
UPDATE item_materiales SET factor_agua_l_kg = 625.0  WHERE lower(trim(nombre)) = 'madera blanda';
UPDATE item_materiales SET factor_agua_l_kg = 625.0  WHERE lower(trim(nombre)) = 'cuero';

UPDATE categoria_materiales_base SET factor_agua_l_kg = 26.0   WHERE lower(trim(nombre)) = 'hierro';
UPDATE categoria_materiales_base SET factor_agua_l_kg = 46.0   WHERE lower(trim(nombre)) = 'acero';
UPDATE categoria_materiales_base SET factor_agua_l_kg = 199.0  WHERE lower(trim(nombre)) = 'polipropileno';
UPDATE categoria_materiales_base SET factor_agua_l_kg = 582.0  WHERE lower(trim(nombre)) = 'espumas rígidas';
UPDATE categoria_materiales_base SET factor_agua_l_kg = 362.5  WHERE lower(trim(nombre)) = 'espumas flexibles';
UPDATE categoria_materiales_base SET factor_agua_l_kg = 625.0  WHERE lower(trim(nombre)) = 'madera dura';
UPDATE categoria_materiales_base SET factor_agua_l_kg = 625.0  WHERE lower(trim(nombre)) = 'madera blanda';
UPDATE categoria_materiales_base SET factor_agua_l_kg = 625.0  WHERE lower(trim(nombre)) = 'cuero';
