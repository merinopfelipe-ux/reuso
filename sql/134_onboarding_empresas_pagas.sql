-- Onboarding directo de empresas que ya pagaron un plan (super_admin invita
-- antes de que la empresa exista). Ver
-- docs/superpowers/specs/2026-09-15-onboarding-empresas-pagas-design.md

-- invitaciones: empresa_id pasa a ser opcional (token "abierto", Camino B del
-- diseño) + columna nueva para el plan comprado, solo se llena cuando
-- empresa_id es nulo (en Camino A el plan ya vive en empresas.plan).
ALTER TABLE invitaciones
  ALTER COLUMN empresa_id DROP NOT NULL;

ALTER TABLE invitaciones
  ADD COLUMN IF NOT EXISTS plan_invitado text
    CHECK (plan_invitado IN ('lab', 'impulso', 'ilimitado'));

-- empresas: CIIU principal + hasta 2 complementarios (DIAN permite 3, DANE
-- solo usa el principal para clasificar — ver diseño sección 4). Reemplaza
-- conceptualmente a `sector` (texto libre), sin borrar esa columna.
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS sector_ciiu_principal text,
  ADD COLUMN IF NOT EXISTS sector_ciiu_secundarios text[] NOT NULL DEFAULT '{}';
