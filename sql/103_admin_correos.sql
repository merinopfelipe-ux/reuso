-- Tabla para historial de correos enviados desde el panel de Superadministrador
CREATE TABLE IF NOT EXISTS public.admin_correos_enviados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asunto TEXT NOT NULL,
  preheader TEXT,
  cuerpo_html TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('comunicado', 'plataforma', 'individual')),
  segmento TEXT NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  destinatarios_count INTEGER NOT NULL DEFAULT 0,
  destinatarios_lista TEXT[] DEFAULT '{}',
  enviado_por UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'enviado',
  error_mensaje TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.admin_correos_enviados ENABLE ROW LEVEL SECURITY;

-- Política: Solo super_admin puede leer y crear registros
CREATE POLICY "super_admin_manage_admin_correos" ON public.admin_correos_enviados
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.rol = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.rol = 'super_admin'
    )
  );

-- Índice para orden por fecha
CREATE INDEX IF NOT EXISTS idx_admin_correos_created_at ON public.admin_correos_enviados(created_at DESC);
