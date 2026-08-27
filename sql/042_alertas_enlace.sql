-- 042: Enlace opcional en alertas — para que al hacer clic en una
-- notificación (ej. "tu cliente abrió la propuesta") navegue directo a la
-- pantalla relevante (la cotización), en vez de solo marcarla como leída.

ALTER TABLE alertas ADD COLUMN IF NOT EXISTS enlace text;
