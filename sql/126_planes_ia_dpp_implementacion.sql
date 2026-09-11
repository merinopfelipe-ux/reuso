-- =====================================================================
-- Migración 126 — Modelo de planes 2026-09: IA, límite de DPP y tarifa
-- de implementación (pago único)
-- Calculadora de Reúso | 2026-09-10
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================
-- Contexto: el modelo de planes pasa a distinguir explícitamente
--   · incluye_ia        — asistente de IA (ingesta de DPP + diagnóstico del
--                         cotizador). Circular Lab NO, Impulso e Ilimitado SÍ.
--   · limite_dpp_mes    — DPP creados por mes. NULL = ilimitado, 0 = no incluye.
--   · tarifa_implementacion_* — cobro único de arranque (parametrización,
--                         ingesta del catálogo histórico y capacitación).
--                         Es informativo: no hay pasarela, el super_admin
--                         registra el pago en las notas de la empresa.
-- Patrón expandir-contraer: solo ADD COLUMN, nada se borra ni se renombra.
-- NULL en config_planes y en empresas_negociaciones significa lo mismo:
-- ilimitado (misma convención que el resto de límites).
-- =====================================================================

ALTER TABLE config_planes
  ADD COLUMN IF NOT EXISTS incluye_ia boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS limite_dpp_mes integer,
  ADD COLUMN IF NOT EXISTS tarifa_implementacion_cop numeric(14,2),
  ADD COLUMN IF NOT EXISTS tarifa_implementacion_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS tarifa_implementacion_eur numeric(14,2),
  ADD COLUMN IF NOT EXISTS borrador_incluye_ia boolean,
  ADD COLUMN IF NOT EXISTS borrador_limite_dpp_mes integer,
  ADD COLUMN IF NOT EXISTS borrador_tarifa_implementacion_cop numeric(14,2),
  ADD COLUMN IF NOT EXISTS borrador_tarifa_implementacion_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS borrador_tarifa_implementacion_eur numeric(14,2);

ALTER TABLE empresas_negociaciones
  ADD COLUMN IF NOT EXISTS incluye_ia boolean,
  ADD COLUMN IF NOT EXISTS limite_dpp_mes integer;

-- ── Semilla según el modelo nuevo ────────────────────────────────────
-- Explora: sin IA, sin DPP.
UPDATE config_planes SET incluye_ia = false, limite_dpp_mes = 0
  WHERE id = 'free';
-- Circular Lab: sin IA, DPP manuales (ilimitados en cantidad), sin cotizaciones.
UPDATE config_planes SET incluye_ia = false, limite_dpp_mes = NULL
  WHERE id = 'lab';
-- Impulso Sostenible: IA, DPP y cotizaciones.
UPDATE config_planes SET incluye_ia = true, limite_dpp_mes = NULL
  WHERE id = 'impulso';
-- Impacto Ilimitado: IA, DPP ilimitado, cotizaciones ilimitadas, MCI.
UPDATE config_planes SET incluye_ia = true, limite_dpp_mes = NULL
  WHERE id = 'ilimitado';
