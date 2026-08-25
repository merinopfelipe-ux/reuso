-- sql/108_material_descripciones.sql
-- Texto de ayuda (tooltip) por cada material "base" del Cotizador
-- (src/lib/cotizador/plantillas-base.ts, BASE_MATERIALES). Un solo texto
-- compartido por toda la plataforma, sin columnas de auditoría (decisión
-- explícita del usuario). Se edita exclusivamente desde /admin/categorias
-- y se muestra en modo solo-lectura en cualquier otra pantalla que
-- renderice un material con ese nombre exacto (ver spec
-- 2026-08-25-tooltips-materiales-design.md).
CREATE TABLE IF NOT EXISTS cotizador_material_descripciones (
  nombre text PRIMARY KEY,
  descripcion text NOT NULL DEFAULT ''
);

ALTER TABLE cotizador_material_descripciones ENABLE ROW LEVEL SECURITY;

-- Lectura abierta a cualquier usuario autenticado (empresa_admin, empleado,
-- super_admin) — no hay dato sensible ni de empresa aquí, es un catálogo
-- compartido. Escritura solo vía service role (adminClient en el backend),
-- nunca desde el cliente.
CREATE POLICY material_descripciones_lectura ON cotizador_material_descripciones
  FOR SELECT USING (auth.role() = 'authenticated');

INSERT INTO cotizador_material_descripciones (nombre, descripcion) VALUES
  ('Hierro', ''),
  ('Acero', ''),
  ('Polipropileno', ''),
  ('Espumas rígidas', 'Bloque duro y denso que sostiene la estructura sin deformarse. Ej.: espuma rosada de alta densidad, espuma aglomerada/prensada (chipboard) y poliestireno extruido (para moldes internos).'),
  ('Espumas flexibles', 'Acolchado suave y elástico que brinda comodidad al sentarse. Ej.: Espuma gris clásica de cojines, espuma viscoelástica (memory foam) y espuma de poliuretano suave para respaldos.'),
  ('Madera dura', 'Madera maciza y resistente para partes expuestas o de alto soporte. Ej.: Roble, cedro y nogal (para patas, brazos a la vista y armazones principales).'),
  ('Madera blanda', 'Material liviano y fácil de trabajar para piezas internas. Ej.: Láminas de MDF, triplex/contrachapado de pino y listones de pino cepillado (para fondos, respaldos ciegos y refuerzos ocultos).'),
  ('Cuero', '')
ON CONFLICT (nombre) DO NOTHING;
