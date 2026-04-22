-- Migración 012: Tabla de contenido legal editable por super_admin
-- Permite al super_admin editar el cuerpo de cada documento legal desde /admin/legal

CREATE TABLE IF NOT EXISTS contenido_legal (
  clave       text PRIMARY KEY,
  titulo      text NOT NULL,
  cuerpo_html text NOT NULL,
  updated_at  timestamptz DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id)
);

-- RLS: todos leen, solo super_admin escribe
ALTER TABLE contenido_legal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos leen contenido legal"
  ON contenido_legal FOR SELECT
  USING (true);

CREATE POLICY "Super admin edita contenido legal"
  ON contenido_legal FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND rol = 'super_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND rol = 'super_admin'
  ));

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_contenido_legal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contenido_legal_updated_at
  BEFORE UPDATE ON contenido_legal
  FOR EACH ROW EXECUTE FUNCTION update_contenido_legal_timestamp();
