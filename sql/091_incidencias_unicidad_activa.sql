-- 091_incidencias_unicidad_activa.sql
-- Evita duplicados reales encontrados en producción: si dos visitas casi
-- simultáneas a /status disparan runChecks() al mismo tiempo, ambas pueden
-- pasar la verificación "¿ya existe una incidencia activa?" antes de que
-- cualquiera termine de insertar (condición de carrera clásica de verificar-
-- y-luego-escribir) — pasó de verdad esta sesión, 3 filas para el mismo
-- incidente de Supabase. Un índice único parcial lo hace imposible a nivel
-- de base de datos, no solo de lógica de aplicación: como máximo una
-- incidencia ACTIVA (no resuelta) por componente + tipo. Ya resueltas sí
-- pueden repetirse (son historial, cada una es un episodio distinto).

CREATE UNIQUE INDEX IF NOT EXISTS idx_dpp_incidencias_activa_unica
  ON dpp_incidencias (componente, tipo)
  WHERE estado != 'resuelto';
