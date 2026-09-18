-- =====================================================================
-- Migración 138 — Peso sugerido por foto (contraste vs. catálogo)
-- Calculadora de Reúso | 2026-09-18
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================

-- Cuando diagnostico/route.ts estima un peso total viendo la foto real y
-- ese número difiere más de 10% del peso genérico del catálogo, se guarda
-- aquí como sugerencia pendiente de aceptar (nunca se aplica solo). Nunca
-- se agrega a item_materiales/items: es del registro confirmado, no del
-- catálogo compartido. Mismo patrón de columna nullable sin backfill que
-- sql/133/sql/135/sql/137.
ALTER TABLE dpp_activos
  ADD COLUMN IF NOT EXISTS peso_foto_sugerido_kg NUMERIC NULL;

ALTER TABLE crm_muebles_cotizados
  ADD COLUMN IF NOT EXISTS peso_foto_sugerido_kg NUMERIC NULL;
