-- ============================================================
-- 120 — Precio anual propio en la negociación por empresa
-- ============================================================
-- A pedido del usuario 2026-09-04: la negociación por empresa adopta el
-- mismo diseño visual que los planes globales (Mensual + Anual por cada
-- moneda), así que gana su propio precio anual, igual de independiente
-- que ya lo es en config_planes (sql/117) — mismo patrón exacto.

ALTER TABLE empresas_negociaciones
  ADD COLUMN IF NOT EXISTS precio_anual_cop numeric(14,2),
  ADD COLUMN IF NOT EXISTS precio_anual_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS precio_anual_eur numeric(14,2);

-- Backfill best-effort para negociaciones ya existentes: mensual x 10
-- ("2 meses gratis"), el super_admin puede corregirlo a mano después.
UPDATE empresas_negociaciones SET
  precio_anual_cop = COALESCE(precio_anual_cop, precio_cop * 10),
  precio_anual_usd = COALESCE(precio_anual_usd, precio_usd * 10),
  precio_anual_eur = COALESCE(precio_anual_eur, precio_eur * 10)
WHERE precio_anual_cop IS NULL OR precio_anual_usd IS NULL OR precio_anual_eur IS NULL;
