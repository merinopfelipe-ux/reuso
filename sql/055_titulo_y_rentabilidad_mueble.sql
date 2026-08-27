-- "Título" pasa a ser el texto visible principal de cada línea cotizada,
-- separado del match de catálogo (item_nombre/tipo_mueble): la IA lo sugiere
-- al detectar la pieza, pero el vendedor puede reescribirlo en cualquier
-- momento sin afectar qué servicios/insumos/materiales trae la línea.
ALTER TABLE crm_muebles_cotizados
  ADD COLUMN IF NOT EXISTS titulo text;

UPDATE crm_muebles_cotizados SET titulo = tipo_mueble WHERE titulo IS NULL;

-- Rentabilidad por línea: hasta hoy items.factor_rentabilidad solo se usaba
-- como referencia visual en /admin/categorias y nunca se aplicaba al precio
-- real cotizado. Ahora cada línea guarda su propio factor (heredado del
-- catálogo al agregar el ítem, editable después sin tocar el catálogo
-- compartido) y el motor de precio sí lo multiplica.
ALTER TABLE crm_muebles_cotizados
  ADD COLUMN IF NOT EXISTS factor_rentabilidad numeric(4,2) NOT NULL DEFAULT 2;
