-- ============================================================
-- Migración 087 — País del cliente del Cotizador + vínculo
-- opcional entre un Pasaporte DPP y el cliente dueño del ítem.
-- ============================================================

-- El cliente del Cotizador (crm_clientes) ya guarda ciudad y
-- dirección, pero no país — hoy InputDireccion asume Colombia
-- fijo en el formulario de identificación.
ALTER TABLE crm_clientes
  ADD COLUMN IF NOT EXISTS pais text;

-- Un DPP siempre es opcional y nunca es dueño del mueble ni parte
-- de la empresa que cotiza (Lurdes): el dueño es el cliente. Se
-- asocia cuando la cotización se gana, o queda sin cliente si el
-- activo se crea de cero (inventario especulativo). ON DELETE SET
-- NULL: borrar un cliente nunca debe borrar la trazabilidad del DPP.
ALTER TABLE dpp_activos
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES crm_clientes(id) ON DELETE SET NULL;
