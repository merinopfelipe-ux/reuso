-- ============================================================
-- Migración 117 — Precio anual editable en config_planes
-- Calculadora de Reúso · Grupo MLP S.A.S
-- Ejecutar en Supabase SQL Editor (staging y producción)
-- ============================================================
--
-- Hasta hoy el precio anual de cada plan era un descuento fijo
-- calculado en el código (ANNUAL_DISCOUNT = 10/12, "2 meses gratis"),
-- aplicado sobre el precio mensual. No existía ninguna forma de
-- editarlo desde /admin/planes.
--
-- Esta migración agrega el precio anual como su propio valor,
-- publicado y en borrador, igual que ya existe para el mensual —
-- editable de forma independiente, con el cálculo de hoy (mensual x
-- 10) como valor inicial, para no cambiar ningún precio real al
-- correr esta migración.
--
-- Patrón expandir-contraer: solo ADD COLUMN, nada se borra ni se
-- renombra, la versión anterior del código sigue funcionando igual
-- (sigue leyendo solo precio_cop/usd/eur, ignora las columnas nuevas
-- hasta que el código que las usa se despliegue).

ALTER TABLE config_planes
  ADD COLUMN IF NOT EXISTS precio_anual_cop numeric(14,2),
  ADD COLUMN IF NOT EXISTS precio_anual_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS precio_anual_eur numeric(14,2),
  ADD COLUMN IF NOT EXISTS borrador_precio_anual_cop numeric(14,2),
  ADD COLUMN IF NOT EXISTS borrador_precio_anual_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS borrador_precio_anual_eur numeric(14,2);

-- Backfill: mismo cálculo que usaba el código hasta hoy (10 meses en
-- vez de 12, "2 meses gratis"). Solo rellena filas que todavía no
-- tengan un precio anual propio.
UPDATE config_planes
SET
  precio_anual_cop = COALESCE(precio_anual_cop, precio_cop * 10),
  precio_anual_usd = COALESCE(precio_anual_usd, precio_usd * 10),
  precio_anual_eur = COALESCE(precio_anual_eur, precio_eur * 10)
WHERE precio_anual_cop IS NULL OR precio_anual_usd IS NULL OR precio_anual_eur IS NULL;
