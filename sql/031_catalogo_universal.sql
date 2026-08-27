-- Migración 031: Motor Lógico Universal de Economía Circular
-- Refactoring de arquitectura del core, NO un cambio específico de Muebles.
--
-- Reglas de oro implementadas:
-- 1. Entidad universal: categorias pasa a ser un árbol auto-referenciado
--    (parent_id) de profundidad libre. No hay tabla fija de "subcategorías":
--    un nodo hijo es una fila más de categorias. Un item cuelga de CUALQUIER
--    nodo del árbol vía su categoria_id ya existente, sin importar la
--    profundidad.
-- 2. Dimensiones aisladas: la info que nutre cada item vive en tablas
--    separadas que jamás se cruzan a nivel de base de datos.
--    - item_materiales      = dimensión AMBIENTAL (huella de carbono/reuso)
--    - item_servicios/insumos = dimensión FINANCIERA (Cotizador)
--    Ningún cálculo suma o combina ambas dimensiones.

-- ─── A. ÁRBOL DE CATEGORÍAS DE PROFUNDIDAD LIBRE ──────────────

ALTER TABLE categorias ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES categorias(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_categorias_parent ON categorias(parent_id);

-- ─── B. ITEMS: campo financiero de rollup (peso_kg/co2_por_unidad ya
--     existen y se mantienen como ROLLUP ambiental = suma de item_materiales)

ALTER TABLE items ADD COLUMN IF NOT EXISTS factor_rentabilidad numeric(4,2) NOT NULL DEFAULT 2;

-- ─── C. DIMENSIÓN AMBIENTAL: item_materiales ──────────────────

CREATE TABLE IF NOT EXISTS item_materiales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  peso_kg         numeric(10,3) NOT NULL,
  factor_co2_kg   numeric(10,4) NOT NULL,
  factor_agua_l_kg numeric(10,4),
  origen_fuente   text,
  detalle_fuente  text,
  nivel_confianza text NOT NULL DEFAULT 'baja' CHECK (nivel_confianza IN ('alta','media','baja')),
  orden           integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_item_materiales_item ON item_materiales(item_id);

-- ─── D. DIMENSIÓN FINANCIERA: item_servicios / item_insumos ───

CREATE TABLE IF NOT EXISTS item_servicios (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  nombre     text NOT NULL,
  precio     numeric(14,2) NOT NULL,
  orden      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_item_servicios_item ON item_servicios(item_id);

CREATE TABLE IF NOT EXISTS item_insumos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  cantidad        numeric(10,3) NOT NULL,
  unidad          text NOT NULL,
  precio_unitario numeric(14,2) NOT NULL,
  orden           integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_item_insumos_item ON item_insumos(item_id);

-- ─── E. COTIZADOR: enlace al catálogo + snapshot editable por unidad ──

ALTER TABLE crm_muebles_cotizados ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES items(id) ON DELETE SET NULL;
ALTER TABLE crm_muebles_cotizados ADD COLUMN IF NOT EXISTS cantidad integer NOT NULL DEFAULT 1;
ALTER TABLE crm_muebles_cotizados ADD COLUMN IF NOT EXISTS materiales_json jsonb;
ALTER TABLE crm_muebles_cotizados ADD COLUMN IF NOT EXISTS servicios_json jsonb;
ALTER TABLE crm_muebles_cotizados ADD COLUMN IF NOT EXISTS insumos_json jsonb;

-- ─── F. RLS (mismo patrón que items/categorias en 001_schema_inicial.sql) ──

ALTER TABLE item_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_servicios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_insumos    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_materiales_read" ON item_materiales FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "item_materiales_super_admin" ON item_materiales FOR ALL USING (get_my_rol() = 'super_admin');

CREATE POLICY "item_servicios_read" ON item_servicios FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "item_servicios_super_admin" ON item_servicios FOR ALL USING (get_my_rol() = 'super_admin');

CREATE POLICY "item_insumos_read" ON item_insumos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "item_insumos_super_admin" ON item_insumos FOR ALL USING (get_my_rol() = 'super_admin');

-- ─── FIN 031 ───────────────────────────────────────────────────
