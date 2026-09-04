-- ============================================================
-- Migración 118 — Límite de cotizaciones/mes por plan
-- Calculadora de Reúso · Grupo MLP S.A.S
-- Ejecutar en Supabase SQL Editor (staging y producción)
-- ============================================================
--
-- Hasta hoy "Cotizador" era solo Sí/No por plan (acceso al módulo),
-- sin un tope mensual de cuántas cotizaciones se pueden crear —
-- distinto de calculos_mes/informes_mes, que sí tienen su propio
-- límite. Se agrega el mismo patrón para cotizaciones.
--
-- Default: 200 para los planes con Cotizador activo (impulso), igual
-- que su límite de cálculos, como punto de partida razonable — el
-- super_admin lo ajusta libremente desde /admin/planes apenas quiera.
-- 'ilimitado' se deja en NULL (= sin tope, mismo significado que el
-- resto de límites de esta tabla). free/lab quedan en 0 porque hoy no
-- tienen el módulo Cotizador activo de todas formas.

ALTER TABLE config_planes
  ADD COLUMN IF NOT EXISTS limite_cotizaciones_mes integer,
  ADD COLUMN IF NOT EXISTS borrador_limite_cotizaciones_mes integer;

ALTER TABLE empresas_negociaciones
  ADD COLUMN IF NOT EXISTS limite_cotizaciones_mes integer;

UPDATE config_planes SET limite_cotizaciones_mes = 0   WHERE id IN ('free', 'lab') AND limite_cotizaciones_mes IS NULL;
UPDATE config_planes SET limite_cotizaciones_mes = 200 WHERE id = 'impulso' AND limite_cotizaciones_mes IS NULL;
-- 'ilimitado' se deja en NULL a propósito (sin tope) — no hace falta UPDATE.
