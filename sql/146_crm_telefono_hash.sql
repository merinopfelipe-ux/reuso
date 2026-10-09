-- 146: CRM — huella del teléfono para buscar y deduplicar sin guardarlo en claro.
-- Expandir-contraer: solo ADD COLUMN IF NOT EXISTS y CREATE UNIQUE INDEX IF NOT EXISTS.
-- Corre en staging (rjcfqcqgqxoblisuyapq) primero, producción después.

ALTER TABLE crm_clientes
  ADD COLUMN IF NOT EXISTS telefono_hash text;

-- Mismo criterio que el índice de teléfono existente: las copias B2C
-- (duplicado_de_id no nulo) comparten el número a propósito.
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_clientes_telefono_hash_unico
  ON crm_clientes (empresa_id, telefono_hash)
  WHERE telefono_hash IS NOT NULL AND duplicado_de_id IS NULL;
