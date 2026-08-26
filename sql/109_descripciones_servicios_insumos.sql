-- sql/109_descripciones_servicios_insumos.sql
-- Corrección sobre la 108: el texto de ayuda dejó de ser exclusivo de los
-- materiales — también lo llevan los servicios y los insumos (pedido del
-- usuario: "igual los costos"). La tabla se renombra para que su nombre no
-- mienta, y se siembran los conceptos que faltaban.
--
-- Es idempotente y sirve tanto para quien ya corrió la 108 original (renombra
-- su tabla, conserva los textos escritos) como para quien parte de cero (la
-- 108 actual ya crea la tabla con el nombre nuevo y el RENAME no hace nada).

ALTER TABLE IF EXISTS cotizador_material_descripciones
  RENAME TO cotizador_descripciones;

CREATE TABLE IF NOT EXISTS cotizador_descripciones (
  nombre text PRIMARY KEY,
  descripcion text NOT NULL DEFAULT ''
);

ALTER TABLE cotizador_descripciones ENABLE ROW LEVEL SECURITY;

-- La policy de la 108 viaja con la tabla al renombrarla, pero pudo haber
-- quedado con el nombre viejo — se rehace con el nombre definitivo.
DROP POLICY IF EXISTS material_descripciones_lectura ON cotizador_descripciones;
DROP POLICY IF EXISTS descripciones_lectura ON cotizador_descripciones;
CREATE POLICY descripciones_lectura ON cotizador_descripciones
  FOR SELECT USING (auth.role() = 'authenticated');

-- Servicios e insumos base (BASE_SERVICIOS / BASE_INSUMOS). Nacen vacíos:
-- una descripción vacía significa "sin tooltip", no se muestra nada.
INSERT INTO cotizador_descripciones (nombre, descripcion) VALUES
  ('Pintor', ''),
  ('Tapicero', ''),
  ('Teñido', ''),
  ('Carpintero', ''),
  ('Tela', '')
ON CONFLICT (nombre) DO NOTHING;
