-- 089_alertas_origen_y_delete.sql
-- Distingue alertas creadas a mano por el super_admin ("admin") de las que
-- el sistema genera solo (ej. "fulano abrió la propuesta", cotización fría
-- sin actividad, respuesta de ticket) — hoy eran indistinguibles salvo por
-- el texto del título, y el super_admin las quiere ver separadas en
-- /admin/alertas (esa pantalla es para SUS alertas, no un log de eventos).

ALTER TABLE alertas
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'admin'
    CHECK (origen IN ('admin', 'sistema'));

-- Backfill: las filas ya existentes generadas por el sistema se detectan por
-- el patrón de título usado en cada endpoint automático (ver
-- src/app/api/cotizador/propuesta/[token]/track/route.ts,
-- src/app/api/cron/cotizaciones-frias/route.ts,
-- src/app/api/tickets/[id]/mensajes/route.ts). Todo lo demás se queda como
-- 'admin' (el valor por defecto), que es lo correcto para cualquier alerta
-- ya creada a mano desde /admin/alertas.
UPDATE alertas SET origen = 'sistema'
  WHERE titulo ILIKE '%abrió la propuesta%'
     OR titulo = 'Cotización sin respuesta'
     OR titulo = 'Nueva respuesta en tu ticket';
