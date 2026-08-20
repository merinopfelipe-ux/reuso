-- Cierra una condición de carrera real: dos llamadas simultáneas a
-- POST /api/cotizador/clientes/[id]/convertir-b2c para el mismo contacto
-- original podían crear dos filas B2C distintas antes de este índice,
-- porque la comprobación "¿ya existe?" en la app no es atómica con el
-- INSERT. Un contacto B2B solo puede tener UNA copia B2C vinculada.
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_clientes_duplicado_de_id_unico
  ON crm_clientes (duplicado_de_id)
  WHERE duplicado_de_id IS NOT NULL;
