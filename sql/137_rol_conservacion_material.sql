-- =====================================================================
-- Migración 137 — Rol de conservación de un material (hueco de F_U/MCI)
-- Calculadora de Reúso | 2026-09-18
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================

-- Frente a la acción de restauración descrita en el título del ítem
-- (ej. "Retapizado de Silla Reina Ana"), un material puede conservarse
-- (la madera de la estructura) o reemplazarse (la tela, la espuma). Es un
-- dato nuevo que cierra el hueco para el futuro cálculo de F_U (fracción de
-- masa preservada, variable central del MCI — Vault:
-- calculos/05-indice-flujo-lineal-mci.md) — el MCI en sí sigue sin código,
-- este cambio NO lo calcula, solo guarda el dato. Mismo patrón que
-- sql/133 (porcentaje_reciclable) y sql/135 (peso de insumos): columna
-- nullable, sin backfill forzado.
--
-- Solo en item_materiales (no en categoria_materiales_base): el rol
-- depende de la acción de un ítem concreto, y la categoría es solo la
-- plantilla genérica sin ninguna acción asociada — ahí quedaría siempre
-- NULL sin motivo.
ALTER TABLE item_materiales
  ADD COLUMN IF NOT EXISTS rol_conservacion text
    CHECK (rol_conservacion IS NULL OR rol_conservacion IN ('se_conserva', 'se_reemplaza', 'desconocido'));
