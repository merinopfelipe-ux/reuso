-- ============================================================
-- Migración 020 — Personalización de marca en propuesta pública
-- Reúso V14.8 · Grupo MLP S.A.S
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS logo_propuesta_url       TEXT,
  ADD COLUMN IF NOT EXISTS nombre_footer_propuesta  TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_propuesta        TEXT,
  ADD COLUMN IF NOT EXISTS mostrar_marca_reuso       BOOLEAN DEFAULT TRUE;
