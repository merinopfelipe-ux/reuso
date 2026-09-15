-- Conserva el cargo declarado por quien firma en representación de una
-- empresa. El dato se muestra en el PDF y queda asociado a la solicitud.
ALTER TABLE firmas_solicitudes
  ADD COLUMN IF NOT EXISTS cargo_representante text;
