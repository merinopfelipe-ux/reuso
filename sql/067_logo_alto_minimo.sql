-- ============================================================
-- Alto mínimo del logo en el header de la cotización pública,
-- editable desde /admin/empresas. Directriz del usuario
-- 2026-08-07: el logo debe verse mucho más grande (mínimo 60px
-- siempre) y reemplaza al nombre, nunca van los dos juntos.
-- ============================================================
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS logo_alto_minimo_px integer NOT NULL DEFAULT 60
  CHECK (logo_alto_minimo_px >= 60);
