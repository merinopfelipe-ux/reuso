-- Migration 016: Crear tabla log_firmas_confidencialidad
-- Ejecutar en Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS log_firmas_confidencialidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo_identidad text NOT NULL,
  numero_identidad text NOT NULL,
  email text NOT NULL,
  indicativo text NOT NULL,
  telefono text NOT NULL,
  ip_address text NOT NULL,
  user_agent text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE log_firmas_confidencialidad ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad: solo el super_admin puede ver los registros de firmas
CREATE POLICY "Super admins pueden ver log_firmas_confidencialidad"
  ON log_firmas_confidencialidad FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.rol = 'super_admin'
    )
  );
