-- ============================================================
-- Crea dos tablas que el código ya usa (leads, config_sistema) pero que
-- nunca existieron en la base real. `leads` estaba definida en sql/006
-- pero esa migración nunca terminó de correr en esta base (certificados sí
-- quedó alterada, pero la tabla leads nunca se creó). `config_sistema`
-- nunca tuvo migración escrita, se usaba directo desde el código.
-- ============================================================

-- ─── leads (captura de prospectos de la landing) ───
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text NOT NULL,
  empresa text,
  interes text,
  mensaje text,
  estado text DEFAULT 'nuevo',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins pueden ver leads"
  ON leads FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin'));

CREATE POLICY "Superadmins pueden actualizar leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin'));

-- El formulario público de la landing inserta sin sesión — mismo patrón que
-- el resto de endpoints públicos del proyecto (inserta vía service role
-- desde el API route, no directo desde el cliente, así que no hace falta
-- una policy de INSERT para anon aquí).

-- ─── config_sistema (fila única de configuración global) ───
CREATE TABLE IF NOT EXISTS config_sistema (
  id text PRIMARY KEY DEFAULT 'default',
  email_notificaciones text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE config_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins gestionan config_sistema"
  ON config_sistema FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin'));
