-- Rediseño del Cotizador: permite que un vendedor (empresa_admin/empleado)
-- cree un "Ítem Maestro" nuevo sin ensuciar el catálogo global. Los ítems
-- existentes/creados por super_admin siguen siendo 'global' (visibles para
-- todas las empresas, comportamiento actual intacto, sin poblar nada a mano).
-- Los ítems nuevos de un vendedor nacen 'restringido', visibles de inmediato
-- solo para su empresa, y se les puede otorgar acceso a otras vía permisos
-- (soft-approval: el ítem se usa ya, solo el factor CO2 queda pendiente de
-- revisión por el super_admin).

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS visibilidad text NOT NULL DEFAULT 'global' CHECK (visibilidad IN ('global', 'restringido')),
  ADD COLUMN IF NOT EXISTS creado_por_empresa_id uuid REFERENCES empresas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creado_por_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pendiente_revision_co2 boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS item_permisos_empresa (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  empresa_id    uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  otorgado_por  uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, empresa_id)
);

ALTER TABLE item_permisos_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_permisos_empresa_super_admin"
  ON item_permisos_empresa FOR ALL
  USING (get_my_rol() = 'super_admin');

-- Cualquier empresa puede leer sus propios permisos (para saber qué ítems
-- restringidos ve); solo super_admin y el dueño del ítem pueden escribir.
CREATE POLICY "item_permisos_empresa_read_own"
  ON item_permisos_empresa FOR SELECT
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "item_permisos_empresa_dueño_write"
  ON item_permisos_empresa FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items i
      WHERE i.id = item_permisos_empresa.item_id
        AND i.creado_por_empresa_id = get_my_empresa_id()
    )
  );

-- Endurece items_read (antes "cualquier usuario autenticado ve cualquier
-- ítem") sin romper la Calculadora general: todo ítem existente/creado por
-- super_admin sigue en 'global' por default.
DROP POLICY IF EXISTS "items_read" ON items;
CREATE POLICY "items_read" ON items FOR SELECT USING (
  visibilidad = 'global'
  OR EXISTS (SELECT 1 FROM item_permisos_empresa p WHERE p.item_id = items.id AND p.empresa_id = get_my_empresa_id())
  OR get_my_rol() = 'super_admin'
);
