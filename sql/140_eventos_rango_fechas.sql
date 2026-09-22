-- =====================================================================
-- Migración 140 — Eventos con rango de fechas (fecha_inicio + fecha_fin)
-- Calculadora de Reúso | 2026-09-21
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================

-- La tabla eventos originalmente solo tenía una columna "fecha".
-- Ahora soporta rangos (ej. un congreso de 3 días) y puede haber
-- varios eventos activos al mismo tiempo.
-- Se renombra "fecha" a "fecha_inicio" y se añade "fecha_fin".

ALTER TABLE eventos RENAME COLUMN fecha TO fecha_inicio;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS fecha_fin date;

-- Si fecha_fin es NULL se interpreta como evento de un solo día
-- (fecha_fin = fecha_inicio). La función getEventoActual en lib/eventos.ts
-- se actualiza para devolver el evento activo en la fecha de hoy según el rango.
