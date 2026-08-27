-- Migración 032: Esquema base (blueprint) por categoría/subcategoría.
--
-- La "madre" es solo un molde: nunca participa en ningún cálculo real de CO2
-- ni de precio. Su única función es pre-llenar la creación de "hijos"
-- (subcategorías e ítems) para que no se empiece de cero cada vez.
-- Misma separación de dimensiones que item_materiales/item_servicios/
-- item_insumos (migración 031) — nunca se cruzan entre sí.

-- ─── A. DIMENSIÓN AMBIENTAL del esquema base (obligatoria al crear categoría) ──

CREATE TABLE IF NOT EXISTS categoria_materiales_base (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id    uuid NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_categoria_materiales_base_cat ON categoria_materiales_base(categoria_id);

-- ─── B. DIMENSIÓN FINANCIERA del esquema base (opcional) ──────────────────

CREATE TABLE IF NOT EXISTS categoria_servicios_base (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  precio       numeric(14,2) NOT NULL,
  orden        integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categoria_servicios_base_cat ON categoria_servicios_base(categoria_id);

CREATE TABLE IF NOT EXISTS categoria_insumos_base (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id    uuid NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  cantidad        numeric(10,3) NOT NULL,
  unidad          text NOT NULL,
  precio_unitario numeric(14,2) NOT NULL,
  orden           integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categoria_insumos_base_cat ON categoria_insumos_base(categoria_id);

-- ─── C. RLS (mismo patrón que item_materiales/item_servicios/item_insumos) ──

ALTER TABLE categoria_materiales_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria_servicios_base  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria_insumos_base    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categoria_materiales_base_read" ON categoria_materiales_base FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "categoria_materiales_base_super_admin" ON categoria_materiales_base FOR ALL USING (get_my_rol() = 'super_admin');

CREATE POLICY "categoria_servicios_base_read" ON categoria_servicios_base FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "categoria_servicios_base_super_admin" ON categoria_servicios_base FOR ALL USING (get_my_rol() = 'super_admin');

CREATE POLICY "categoria_insumos_base_read" ON categoria_insumos_base FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "categoria_insumos_base_super_admin" ON categoria_insumos_base FOR ALL USING (get_my_rol() = 'super_admin');

-- ─── FIN 032 ───────────────────────────────────────────────────
