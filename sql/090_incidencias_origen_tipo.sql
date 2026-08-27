-- 090_incidencias_origen_tipo.sql
-- Refuerzo de /status: distingue incidencias creadas a mano por el
-- super_admin ("admin") de las que el sistema detecta y reporta solo
-- ("sistema"), y separa "algo se rompió" (incidente) de "aviso programado"
-- (mantenimiento) — ver docs/superpowers/specs/2026-08-14-status-page-refuerzo-design.md.

ALTER TABLE dpp_incidencias
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'admin'
    CHECK (origen IN ('admin', 'sistema')),
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'incidente'
    CHECK (tipo IN ('incidente', 'mantenimiento'));

-- Backfill: las incidencias ya creadas por el auto-reporte de runChecks()
-- tienen un título con uno de estos 2 patrones fijos (ver
-- src/lib/status-checker.ts) — todo lo demás (creado a mano desde
-- /admin/status) se queda en 'admin', el valor por defecto.
UPDATE dpp_incidencias SET origen = 'sistema'
  WHERE titulo LIKE 'Interrupción detectada en %'
     OR titulo LIKE 'Rendimiento degradado en %';
