-- La empresa es el cliente en B2B: los contactos (nombre/apellido/
-- teléfono/correo) pasan a ser opcionales. es_contacto_real distingue una
-- fila con datos reales de persona de una fila-ancla autocompletada con el
-- nombre de la empresa (para cliente_id de la cotización, que sigue
-- apuntando a una fila de crm_clientes). duplicado_de_id vincula un
-- contacto B2B con su copia B2C ("convertir en cliente B2C").
ALTER TABLE crm_clientes
  ADD COLUMN IF NOT EXISTS es_contacto_real boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS duplicado_de_id uuid REFERENCES crm_clientes(id);

-- El mismo celular solo puede repetirse entre un contacto y su copia
-- vinculada (duplicado_de_id IS NOT NULL queda fuera de esta comprobación) —
-- entre dos filas sin relación, sigue bloqueado exactamente como hoy.
DROP INDEX IF EXISTS idx_crm_clientes_telefono;
CREATE UNIQUE INDEX idx_crm_clientes_telefono
  ON crm_clientes (empresa_id, telefono_indicativo, telefono)
  WHERE telefono IS NOT NULL AND duplicado_de_id IS NULL;
