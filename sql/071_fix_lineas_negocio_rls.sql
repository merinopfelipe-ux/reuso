-- ============================================================
-- Corrige un bug real de RLS en sql/070_lineas_negocio.sql: la política
-- "Lectura pública de lineas de negocio" decía en el comentario que solo
-- mostraba líneas ACTIVAS, pero el USING real era (true), sin filtrar por
-- `activa` — cualquier usuario autenticado podía leer líneas inactivas.
-- Encontrado en auditoría 2026-08-10.
-- ============================================================
DROP POLICY IF EXISTS "Lectura pública de lineas de negocio" ON public.lineas_negocio;

CREATE POLICY "Lectura pública de lineas de negocio activas"
ON public.lineas_negocio FOR SELECT
TO authenticated
USING (activa = true);

-- La política "Super admin acceso total lineas_negocio" (FOR ALL) ya
-- existente en sql/070 sigue dándole a super_admin acceso completo,
-- incluidas las líneas inactivas, sin cambios.
