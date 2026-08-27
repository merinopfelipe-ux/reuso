-- Vincula un ticket de soporte a un cliente CRM puntual (crm_clientes), de
-- forma opcional — hoy los tickets solo se ligan a la empresa/usuario que
-- los crea, sin poder identificar de qué cliente concreto se trataba.
-- Permite mostrar un "Historial de tickets" en la ficha de cada cliente
-- (persona o empresa) en /empresa/clientes/[id].
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES crm_clientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_cliente_id ON tickets(cliente_id) WHERE cliente_id IS NOT NULL;
