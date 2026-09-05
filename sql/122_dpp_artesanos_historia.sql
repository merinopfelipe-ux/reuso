-- ============================================================
-- Migración 122 — Artesanos/personas e historia/valor sentimental del DPP
-- Calculadora de Reúso · Grupo MLP S.A.S
-- Ejecutar en Supabase SQL Editor (producción y staging)
-- ============================================================
--
-- Cálculos #18 y #19 del catálogo oficial de 19 cálculos (ver Vault,
-- conceptos/calculo-de-reuso.md, sección 0). Son datos, no fórmulas —
-- solo agregan las columnas, nadie las lee ni las escribe todavía en
-- la UI (eso queda para cuando se conecte el formulario del DPP).
--
-- Autorizado por el usuario 2026-09-05 junto con la metodología
-- "Intermedia" para los cálculos #6/#12/#16 (ver Vault,
-- conceptos/normativa-europea-dpp-y-reclamos-ambientales.md, sección 4).

-- #18 — Artesanos/personas que intervinieron. Es por CICLO (una
-- restauración puede tener un artesano distinto al de la anterior),
-- no por activo. Esquema polimórfico (sirve tanto para un taller como
-- para un artesano individual) ya documentado en el Vault.
ALTER TABLE dpp_ciclos
  ADD COLUMN IF NOT EXISTS responsable_intervencion_json JSONB;

COMMENT ON COLUMN dpp_ciclos.responsable_intervencion_json IS
  'Cálculo #18 del catálogo oficial. Esquema: {"responsable_intervencion": {"tipo", "nombre", "oficio_especialidad", "taller_nombre", "ubicacion", "horas_mano_obra_invertidas", "tecnicas_aplicadas": [], "inspeccion_calidad_aprobada", "fecha_intervencion"}}. Ver conceptos/pasaporte-digital-dpp.md sección 2.1 en el Vault.';

-- #19 — Historia y valor sentimental. Es por ACTIVO (la historia del
-- mueble en sí, no de un ciclo puntual), texto libre.
ALTER TABLE dpp_activos
  ADD COLUMN IF NOT EXISTS historia_valor_sentimental TEXT;

COMMENT ON COLUMN dpp_activos.historia_valor_sentimental IS
  'Cálculo #19 del catálogo oficial. Texto libre, opcional.';
