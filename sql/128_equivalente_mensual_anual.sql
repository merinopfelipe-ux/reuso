-- =====================================================================
-- Migración 128 — Equivalente mensual del plan anual, editable a mano
-- Calculadora de Reúso | 2026-09-11
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================
-- La landing muestra, al elegir "Anual", el equivalente mensual (precio
-- anual / 12) como cifra de referencia bajo el precio grande. Ese cálculo
-- casi nunca cae en un número limpio, así que por defecto se redondea
-- hacia abajo en el propio código (COP a la decena de mil, USD/EUR a la
-- decena). Estas columnas permiten que el super_admin lo edite a mano por
-- plan y moneda cuando el redondeo automático no se vea bien — si están
-- en NULL, se usa el cálculo automático. El precio anual real
-- (precio_anual_*) NUNCA se toca por esto.
-- =====================================================================

ALTER TABLE config_planes
  ADD COLUMN IF NOT EXISTS equivalente_mensual_anual_cop numeric(14,2),
  ADD COLUMN IF NOT EXISTS equivalente_mensual_anual_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS equivalente_mensual_anual_eur numeric(14,2),
  ADD COLUMN IF NOT EXISTS borrador_equivalente_mensual_anual_cop numeric(14,2),
  ADD COLUMN IF NOT EXISTS borrador_equivalente_mensual_anual_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS borrador_equivalente_mensual_anual_eur numeric(14,2);
