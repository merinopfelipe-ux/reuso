-- ============================================================
-- Migración 116 — CASCADE faltante en dpp_verificaciones
-- Calculadora de Reúso · Grupo MLP S.A.S
-- Ejecutar en Supabase SQL Editor (producción y staging)
-- ============================================================
--
-- Bug real encontrado 2026-09-02 corriendo las pruebas automáticas
-- contra staging.
--
-- La migración 026 puso ON DELETE CASCADE en las tablas hijas de
-- dpp_activos (dpp_documentos_ingesta, dpp_ciclos,
-- dpp_metricas_financieras) pero dejó por fuera dpp_verificaciones,
-- que quedó con el comportamiento por defecto (NO ACTION).
--
-- Consecuencia real, no solo de pruebas: cada visita a la página
-- pública /pasaporte/[codigo] inserta una fila en dpp_verificaciones.
-- Por eso, apenas alguien escanea el QR de un pasaporte UNA vez, ese
-- dpp_activos ya no se puede borrar, y su empresa tampoco — la
-- eliminación falla con "violates foreign key constraint
-- dpp_verificaciones_activo_id_fkey".
--
-- Esta migración solo cambia el comportamiento de borrado de la
-- llave foránea. No borra datos, no elimina columnas y no rompe la
-- versión anterior del código (expandir-contraer).

ALTER TABLE dpp_verificaciones
  DROP CONSTRAINT IF EXISTS dpp_verificaciones_activo_id_fkey,
  ADD CONSTRAINT dpp_verificaciones_activo_id_fkey
    FOREIGN KEY (activo_id) REFERENCES dpp_activos(id) ON DELETE CASCADE;
