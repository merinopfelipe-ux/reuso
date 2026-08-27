-- 092_tickets_origen.sql
-- Distingue un ticket creado por la propia empresa/usuario de uno que el
-- super_admin redactó a nombre de una empresa que no podía o no sabía
-- hacerlo (mismo patrón ya usado en alertas.origen e incidencias.origen).

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'usuario'
    CHECK (origen IN ('usuario', 'admin'));
