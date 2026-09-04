-- ============================================================
-- 119 — Ciclo de facturación por empresa (mensual/anual) + próxima renovación
-- ============================================================
-- A pedido del usuario 2026-09-04: el "módulo de negociación" se mueve de
-- /admin/planes a la ficha de cada empresa (/admin/empresas/[id]), y junto
-- a él se agrega un dato nuevo que hoy no existe en ningún lado: si la
-- empresa paga mensual o anual, y cuándo le toca renovar.
--
-- Es un campo MANUAL — no hay pasarela de pagos integrada (ver skill
-- modelo-negocio-reuso), el super_admin lo marca a mano igual que las
-- notas privadas. No cambia ningún cálculo ni cobro automático, y no
-- selecciona por sí solo cuál de los 2 precios (mensual/anual) de
-- config_planes se le cobra a la empresa — eso sigue siendo una decisión
-- humana fuera del sistema, esto solo lo deja registrado para consulta.

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS ciclo_facturacion text
    CHECK (ciclo_facturacion IN ('mensual', 'anual')),
  ADD COLUMN IF NOT EXISTS proxima_renovacion date;
