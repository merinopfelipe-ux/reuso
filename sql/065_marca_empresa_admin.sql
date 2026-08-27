-- ============================================================
-- Marca gestionable desde /admin/empresas (super_admin): logo
-- vectorial y sección "¿Por qué elegirnos?" de la cotización
-- pública. La "razón social" y el logo raster para PDF ya
-- existen (nombre_footer_propuesta, logo_propuesta_url, ver
-- migración 020) — no se duplican, solo se hacen editables
-- desde el panel de super_admin además del panel de empresa.
-- ============================================================

-- Logo en SVG para el header de la cotización pública (día/noche).
-- El logo raster derivado (para el PDF, que no soporta SVG) sigue
-- viviendo en logo_propuesta_url, generado automáticamente al subir
-- el SVG.
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS logo_svg_url text;

-- { parrafo: string, bullets: string[], imagen_url: string | null }
-- null = usa el contenido por defecto que hoy está hardcodeado en
-- la cotización pública.
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS por_que_elegirnos_json jsonb;
