-- =====================================================================
-- Migración 133 — % reciclable por material, base para estimar residuo
-- reciclable sin que el taller lo mida a mano cada vez.
-- Calculadora de Reúso | 2026-09-13
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================
ALTER TABLE item_materiales
  ADD COLUMN IF NOT EXISTS porcentaje_reciclable numeric(5,2)
    CHECK (porcentaje_reciclable IS NULL OR (porcentaje_reciclable >= 0 AND porcentaje_reciclable <= 100));

ALTER TABLE categoria_materiales_base
  ADD COLUMN IF NOT EXISTS porcentaje_reciclable numeric(5,2)
    CHECK (porcentaje_reciclable IS NULL OR (porcentaje_reciclable >= 0 AND porcentaje_reciclable <= 100));

-- Backfill best-effort por categoria_material — el super_admin lo revisa
-- después en /admin/categorias, igual que ya se hizo con categoria_material
-- en sql/114 (no es un valor definitivo, es un punto de partida razonable).
UPDATE item_materiales SET porcentaje_reciclable = 90 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'metal';
UPDATE item_materiales SET porcentaje_reciclable = 70 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'vidrio';
UPDATE item_materiales SET porcentaje_reciclable = 60 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'madera';
UPDATE item_materiales SET porcentaje_reciclable = 50 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'carton_papel';
UPDATE item_materiales SET porcentaje_reciclable = 30 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'plastico';
UPDATE item_materiales SET porcentaje_reciclable = 20 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'textil';
UPDATE item_materiales SET porcentaje_reciclable = 10 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'espuma_relleno';
UPDATE item_materiales SET porcentaje_reciclable = 10 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'cuero';
UPDATE item_materiales SET porcentaje_reciclable = 0  WHERE porcentaje_reciclable IS NULL AND (categoria_material = 'otros' OR categoria_material IS NULL);

-- Repetir el mismo bloque de UPDATE para categoria_materiales_base.
UPDATE categoria_materiales_base SET porcentaje_reciclable = 90 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'metal';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 70 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'vidrio';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 60 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'madera';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 50 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'carton_papel';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 30 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'plastico';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 20 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'textil';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 10 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'espuma_relleno';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 10 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'cuero';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 0  WHERE porcentaje_reciclable IS NULL AND (categoria_material = 'otros' OR categoria_material IS NULL);
