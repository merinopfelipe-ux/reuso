-- ============================================================
-- Datos operativos básicos de la empresa (NIT, teléfono, ubicación,
-- sitio web, tamaño) — editables desde /admin/empresas/[id], sección
-- "Datos básicos" de marca-empresa-client.tsx. Ninguno es obligatorio
-- (empresas ya existentes quedan con estos campos en null; el banner
-- de "Datos operativos incompletos" en estado-cuenta-client.tsx invita
-- al super_admin a completarlos).
-- ============================================================
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS nit text,
  ADD COLUMN IF NOT EXISTS telefono text,
  ADD COLUMN IF NOT EXISTS pais text,
  ADD COLUMN IF NOT EXISTS ciudad text,
  ADD COLUMN IF NOT EXISTS direccion text,
  ADD COLUMN IF NOT EXISTS sitio_web text,
  ADD COLUMN IF NOT EXISTS tamano_empresa text;
