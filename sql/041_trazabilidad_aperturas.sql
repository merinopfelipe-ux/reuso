-- 041: Trazabilidad extendida de aperturas de propuesta (crm_cotizaciones_aperturas)
--
-- Hoy la tabla (migración 036) solo guarda ip_address/user_agent/created_at.
-- El vendedor pidió ver de dónde llegó el cliente, ubicación aproximada y
-- cuánto tiempo estuvo viendo la propuesta. El dispositivo/navegador NO
-- necesita columna nueva: se calcula en el frontend a partir del user_agent
-- ya guardado (src/lib/parse-user-agent.ts).

ALTER TABLE crm_cotizaciones_aperturas
  ADD COLUMN IF NOT EXISTS referrer     text,
  ADD COLUMN IF NOT EXISTS ciudad       text,
  ADD COLUMN IF NOT EXISTS pais         text,
  ADD COLUMN IF NOT EXISTS duracion_seg integer;
