-- =====================================================================
-- Migración 131 — Personalización de capacidades (MCI e Informes Excel/CSV)
-- Calculadora de Reúso | 2026-09-13
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================
-- Permite activar o desactivar el Indicador de Circularidad de Materiales
-- (MCI - ISO 59020) y la exportación de Informes en Excel y CSV por plan
-- desde /admin/contenido (pestaña Precios).
-- =====================================================================

ALTER TABLE config_planes
  ADD COLUMN IF NOT EXISTS incluye_mci boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS borrador_incluye_mci boolean,
  ADD COLUMN IF NOT EXISTS incluye_excel_csv boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS borrador_incluye_excel_csv boolean;

ALTER TABLE empresas_negociaciones
  ADD COLUMN IF NOT EXISTS incluye_mci boolean,
  ADD COLUMN IF NOT EXISTS incluye_excel_csv boolean;

-- Semilla inicial según el modelo de planes:
UPDATE config_planes SET incluye_mci = false, borrador_incluye_mci = false, incluye_excel_csv = false, borrador_incluye_excel_csv = false
  WHERE id IN ('free', 'lab', 'impulso');
UPDATE config_planes SET incluye_mci = true, borrador_incluye_mci = true, incluye_excel_csv = true, borrador_incluye_excel_csv = true
  WHERE id = 'ilimitado';
