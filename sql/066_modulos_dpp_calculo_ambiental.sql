-- ============================================================
-- Módulos activos reales: DPP y Cálculo de huella se suman a
-- Cotizador CRM como gates de acceso de verdad (antes solo
-- Cotizador tenía efecto — DPP y Cálculo eran togglables en la
-- UI pero no bloqueaban nada). Directriz del usuario 2026-08-06.
-- ============================================================

-- ─── 1. Sembrar los 2 módulos nuevos ───────────────────────────
INSERT INTO modulos (clave, nombre, icono_lucide, descripcion, activo, orden)
VALUES
  ('calculo_ambiental', 'Cálculo de huella', 'Leaf', 'Registrar objetos reutilizados y medir su impacto ambiental (CO2 y agua evitados).', true, 5),
  ('dpp', 'Pasaporte Digital (DPP)', 'IdCard', 'Trazabilidad de ciclo de vida, códigos QR y verificación pública de activos.', true, 20)
ON CONFLICT DO NOTHING;

-- Por si ya existían con ese nombre pero sin clave (mismo patrón que 019)
UPDATE modulos SET clave = 'calculo_ambiental' WHERE nombre = 'Cálculo de huella' AND clave IS NULL;
UPDATE modulos SET clave = 'dpp' WHERE nombre = 'Pasaporte Digital (DPP)' AND clave IS NULL;

-- ─── 2. Backfill: TODA empresa existente queda con acceso activo
--        a los 2 módulos nuevos. Sin esto, el gate nuevo del
--        middleware bloquearía a todo el mundo de inmediato el
--        día que se active — nadie debe perder acceso hoy. ───
INSERT INTO modulos_empresas (modulo_id, empresa_id, activo)
SELECT m.id, e.id, true
FROM modulos m
CROSS JOIN empresas e
WHERE m.clave IN ('calculo_ambiental', 'dpp')
ON CONFLICT (modulo_id, empresa_id) DO NOTHING;

-- ─── 3. Limpieza: "Módulo Base" era un registro de prueba (clave
--        NULL, descripción basura), no controlaba nada. ───
DELETE FROM modulos WHERE clave IS NULL AND nombre = 'Módulo Base';
