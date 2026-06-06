-- ─── TABLA: dpp_incidencias ─────────────────────────────
-- Permite registrar incidencias en tiempo real para el status page

CREATE TABLE IF NOT EXISTS dpp_incidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  componente VARCHAR(50) NOT NULL, -- 'gemini', 'groq', 'openrouter', 'qwen', 'supabase', 'calculadora'
  estado VARCHAR(20) NOT NULL DEFAULT 'investigando', -- 'investigando', 'identificado', 'monitoreando', 'resuelto'
  severidad VARCHAR(20) NOT NULL DEFAULT 'menor', -- 'menor', 'mayor', 'critico'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar Row Level Security
ALTER TABLE dpp_incidencias ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- 1. Cualquier usuario (anónimo o autenticado) puede leer las incidencias
CREATE POLICY "Permitir lectura publica de incidencias"
  ON dpp_incidencias FOR SELECT
  USING (true);

-- 2. Solo los super_admin pueden realizar operaciones de escritura, edición y eliminación
CREATE POLICY "Permitir gestion de incidencias solo a super_admin"
  ON dpp_incidencias FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.rol = 'super_admin'
    )
  );
