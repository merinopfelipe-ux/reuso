-- ============================================================
-- Descripción editable por línea de cotización (crm_muebles_cotizados).
-- Directriz del usuario 2026-08-07: la vista pública (galería y lista)
-- debe mostrar "Nombre para mostrar" + descripción real, nunca los
-- nombres de servicios ("Tapicero", "Pintor") como si fueran descripción.
-- ============================================================
ALTER TABLE crm_muebles_cotizados
  ADD COLUMN IF NOT EXISTS descripcion text;
