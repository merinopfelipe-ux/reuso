-- Persiste el toggle "Agrupar por área metropolitana" de Top Ciudades
-- (/empresa/cotizador, SalesDashboard) — hoy solo se guardaba el diccionario
-- de grupos (ciudades_agrupadas_config), nunca el estado del switch, así que
-- recargar la página siempre lo mostraba apagado aunque se hubiera activado
-- y guardado. También corrige el default de ciudades_agrupadas_config para
-- que coincida con el que ya usa el frontend (capitalizado), evitando la
-- normalización especial hardcodeada que existía solo para Medellín/Bogotá.

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS ciudades_agrupar_activo boolean NOT NULL DEFAULT false;

ALTER TABLE empresas
  ALTER COLUMN ciudades_agrupadas_config SET DEFAULT '{"Medellín": [], "Bogotá": []}'::jsonb;
