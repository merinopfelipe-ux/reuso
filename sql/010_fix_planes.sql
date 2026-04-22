-- ─── Migración: corregir nombres de planes en tabla empresas ───────────────���─
-- Los planes viejos (pyme, corporativo, enterprise) se reemplazan por los actuales.
-- Ejecutar ANTES de cualquier cambio de plan en producción.

-- 1. Actualizar filas existentes con planes viejos (por si hay datos en producción)
UPDATE empresas SET plan = 'lab'      WHERE plan = 'pyme';
UPDATE empresas SET plan = 'impulso'  WHERE plan = 'corporativo';
UPDATE empresas SET plan = 'ilimitado' WHERE plan = 'enterprise';

-- 2. Eliminar la constraint vieja
ALTER TABLE empresas DROP CONSTRAINT IF EXISTS empresas_plan_check;

-- 3. Añadir la constraint con los planes actuales
ALTER TABLE empresas ADD CONSTRAINT empresas_plan_check
  CHECK (plan IN ('free', 'lab', 'impulso', 'ilimitado'));
