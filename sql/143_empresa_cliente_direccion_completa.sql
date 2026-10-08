-- 143: Dirección completa (principal + sedes) pasa a crm_empresas_clientes.
-- crm_clientes conserva sus columnas de dirección para personas sin empresa.
-- Expandir-contraer: solo ADD COLUMN IF NOT EXISTS.

ALTER TABLE crm_empresas_clientes
  ADD COLUMN IF NOT EXISTS pais             text,
  ADD COLUMN IF NOT EXISTS ciudad           text,
  ADD COLUMN IF NOT EXISTS direccion_notas  text,
  -- sedes adicionales: [{nombre: "Bodega norte", pais: "...", ciudad: "...", direccion: "...", principal: false}]
  ADD COLUMN IF NOT EXISTS sedes jsonb DEFAULT '[]'::jsonb NOT NULL;
