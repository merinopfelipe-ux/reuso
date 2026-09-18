-- =====================================================================
-- Migración 136 — Caché global de factores CO2/agua de materiales (Perplexity)
-- Calculadora de Reúso | 2026-09-18
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================

-- El factor de CO2/agua de un material (ej. "Hierro") es casi una constante
-- física — no varía por categoría ni por empresa. Mismo criterio que
-- peso_insumos_referencia (migración 135): se cachea globalmente para no
-- pagar una búsqueda real de Perplexity más de una vez por material.
CREATE TABLE IF NOT EXISTS factores_material_referencia (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_normalizado text NOT NULL UNIQUE,
  factor_co2_kg      numeric(10,4) NOT NULL,
  factor_agua_l_kg   numeric(10,4),
  fuente_url         text,
  fuente_titulo      text,
  confianza          text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
