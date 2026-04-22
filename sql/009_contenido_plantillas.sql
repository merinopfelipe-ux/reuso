-- ─── Bloque 10: Contenido editable de la landing + Plantillas de documentos ──

-- Contenido editable de la landing
CREATE TABLE IF NOT EXISTS contenido_landing (
  clave      text PRIMARY KEY,
  valor_json jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Plantillas de documentos (certificado / informe)
CREATE TABLE IF NOT EXISTS plantillas_documentos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo             text CHECK (tipo IN ('certificado', 'informe')),
  activa           boolean DEFAULT false,
  encabezado_html  text,
  pie_legal        text,
  firmante_nombre  text,
  firmante_cargo   text,
  firma_imagen_url text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Solo 1 plantilla activa por tipo
CREATE UNIQUE INDEX IF NOT EXISTS plantillas_activas_idx
  ON plantillas_documentos(tipo) WHERE activa = true;

-- Índices
CREATE INDEX IF NOT EXISTS idx_contenido_clave ON contenido_landing(clave);

-- RLS contenido_landing
ALTER TABLE contenido_landing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos leen contenido" ON contenido_landing
  FOR SELECT USING (true);
CREATE POLICY "Super admin edita contenido" ON contenido_landing
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin'));

-- RLS plantillas_documentos
ALTER TABLE plantillas_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin gestiona plantillas" ON plantillas_documentos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin'));
