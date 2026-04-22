-- ============================================================
-- Calculadora de Reúso — Schema Bloque 7: Leads y Revocación
-- ============================================================

-- 1. Añadimos soporte para revocación en la tabla certificados
ALTER TABLE certificados ADD COLUMN IF NOT EXISTS revocado boolean DEFAULT false;
ALTER TABLE certificados ADD COLUMN IF NOT EXISTS motivo_revocacion text;

-- 2. Creamos la tabla de leads para capturar prospectos de la landing
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text NOT NULL,
  empresa text,
  interes text, -- ej. "Plan Corporativo", "Blockchain", etc.
  mensaje text,
  estado text DEFAULT 'nuevo', -- nuevo, contactado, cerrado, descartado
  created_at timestamptz DEFAULT now()
);

-- 3. Políticas RLS para Leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Solo el super_admin puede ver los leads
CREATE POLICY "Super admins pueden ver leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.rol = 'super_admin'
    )
  );

-- Cualquiera (incluyendo anon) puede enviar un lead (INSERT)
CREATE POLICY "Cualquiera puede enviar leads"
  ON leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Solo el super_admin puede actualizar leads
CREATE POLICY "Super admins pueden actualizar leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.rol = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.rol = 'super_admin'
    )
  );
