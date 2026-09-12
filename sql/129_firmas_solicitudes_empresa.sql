-- Firma electrónica a nombre de una empresa (no solo persona natural):
-- QA pub-16, 2026-09-11. El firmante puede representar a una empresa
-- (razón social + NIT) además de sus propios datos, o firmar solo a
-- título personal (persona natural) — sin cambios en ese caso.
ALTER TABLE firmas_solicitudes
  ADD COLUMN IF NOT EXISTS es_empresa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS razon_social text,
  ADD COLUMN IF NOT EXISTS nit text;
