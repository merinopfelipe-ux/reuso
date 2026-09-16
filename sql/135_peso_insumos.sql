-- =====================================================================
-- Migración 135 — Peso de insumos (hueco de F_U en el MCI) + caché global
-- Calculadora de Reúso | 2026-09-16
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================

-- Peso de UNA unidad del insumo (coherente con cantidad/unidad existentes).
-- Nullable, sin backfill forzado — se llena progresivamente.
ALTER TABLE item_insumos
  ADD COLUMN IF NOT EXISTS peso_kg numeric(10,3);
ALTER TABLE categoria_insumos_base
  ADD COLUMN IF NOT EXISTS peso_kg numeric(10,3);

-- Caché global (todas las empresas) de pesos ya estimados por IA para un
-- insumo ad-hoc de cotización — el peso de "1 litro de barniz" no cambia
-- por empresa ni por tiempo, así que se comparte en vez de recalcularse.
CREATE TABLE IF NOT EXISTS peso_insumos_referencia (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_normalizado text NOT NULL,
  unidad             text NOT NULL,
  peso_kg            numeric(10,3) NOT NULL,
  fuente_url         text,
  confianza          text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nombre_normalizado, unidad)
);
