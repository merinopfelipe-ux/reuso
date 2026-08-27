-- Notas sobre la dirección del cliente (instrucciones de entrega, punto de
-- referencia, apto/torre, etc.) — separado de `direccion` en sí, que sigue
-- siendo solo la dirección formal.

ALTER TABLE crm_clientes ADD COLUMN IF NOT EXISTS direccion_notas text;
