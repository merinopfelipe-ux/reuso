-- sql/108_material_descripciones.sql
-- Texto de ayuda (tooltip) por cada concepto "base" del Cotizador: los
-- materiales, servicios e insumos fijos de src/lib/cotizador/plantillas-base.ts
-- (BASE_MATERIALES, BASE_SERVICIOS, BASE_INSUMOS). Un solo texto compartido
-- por toda la plataforma, sin columnas de auditoría (decisión explícita del
-- usuario). Se edita exclusivamente desde /admin/categorias y se muestra en
-- modo solo-lectura en cualquier otra pantalla que renderice ese concepto
-- (ver spec 2026-08-25-tooltips-materiales-design.md).
--
-- La clave es solo `nombre` (sin columna de tipo) porque los nombres no se
-- repiten entre las tres listas: ningún servicio se llama igual que un
-- material o un insumo. Si alguna vez se agrega un nombre duplicado entre
-- listas, hay que introducir una columna `tipo` y volver la PK compuesta.
CREATE TABLE IF NOT EXISTS cotizador_descripciones (
  nombre text PRIMARY KEY,
  descripcion text NOT NULL DEFAULT ''
);

ALTER TABLE cotizador_descripciones ENABLE ROW LEVEL SECURITY;

-- Lectura abierta a cualquier usuario autenticado (empresa_admin, empleado,
-- super_admin) — no hay dato sensible ni de empresa aquí, es un catálogo
-- compartido. Escritura solo vía service role (adminClient en el backend),
-- nunca desde el cliente.
DROP POLICY IF EXISTS descripciones_lectura ON cotizador_descripciones;
CREATE POLICY descripciones_lectura ON cotizador_descripciones
  FOR SELECT USING (auth.role() = 'authenticated');

INSERT INTO cotizador_descripciones (nombre, descripcion) VALUES
  -- Materiales (BASE_MATERIALES)
  ('Hierro', ''),
  ('Acero', ''),
  ('Polipropileno', ''),
  ('Espumas rígidas', 'Bloque duro y denso que sostiene la estructura sin deformarse. Ej.: espuma rosada de alta densidad, espuma aglomerada/prensada (chipboard) y poliestireno extruido (para moldes internos).'),
  ('Espumas flexibles', 'Acolchado suave y elástico que brinda comodidad al sentarse. Ej.: Espuma gris clásica de cojines, espuma viscoelástica (memory foam) y espuma de poliuretano suave para respaldos.'),
  ('Madera dura', 'Madera maciza y resistente para partes expuestas o de alto soporte. Ej.: Roble, cedro y nogal (para patas, brazos a la vista y armazones principales).'),
  ('Madera blanda', 'Material liviano y fácil de trabajar para piezas internas. Ej.: Láminas de MDF, triplex/contrachapado de pino y listones de pino cepillado (para fondos, respaldos ciegos y refuerzos ocultos).'),
  ('Cuero', ''),
  -- Servicios (BASE_SERVICIOS) — quedan vacíos, se llenan desde /admin/categorias
  ('Pintor', ''),
  ('Tapicero', ''),
  ('Teñido', ''),
  ('Carpintero', ''),
  -- Insumos (BASE_INSUMOS)
  ('Tela', '')
ON CONFLICT (nombre) DO NOTHING;
