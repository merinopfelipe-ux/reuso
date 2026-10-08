-- 144: Tickets vinculados a empresa cliente (crm_empresas_clientes)
-- Complementa cliente_id (crm_clientes) existente desde migración 094.
-- Un ticket puede tener uno, ambos o ninguno.
-- Expandir-contraer: solo ADD COLUMN IF NOT EXISTS.

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS empresa_cliente_id uuid REFERENCES crm_empresas_clientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_empresa_cliente_id ON tickets(empresa_cliente_id) WHERE empresa_cliente_id IS NOT NULL;
