-- 104: Seguimiento, métricas y trazabilidad de aperturas/clics de correos administrativos
CREATE TABLE IF NOT EXISTS public.admin_correos_destinatarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correo_id UUID NOT NULL REFERENCES public.admin_correos_enviados(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT,
  empresa_nombre TEXT,
  track_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  estado TEXT NOT NULL DEFAULT 'entregado' CHECK (estado IN ('entregado', 'abierto', 'clic', 'rebotado', 'desuscrito')),
  aperturas_count INTEGER NOT NULL DEFAULT 0,
  primera_apertura_at TIMESTAMPTZ,
  ultima_apertura_at TIMESTAMPTZ,
  clics_count INTEGER NOT NULL DEFAULT 0,
  primer_clic_at TIMESTAMPTZ,
  ultimo_clic_at TIMESTAMPTZ,
  desuscrito BOOLEAN NOT NULL DEFAULT FALSE,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Columnas de agregados en admin_correos_enviados
ALTER TABLE public.admin_correos_enviados
  ADD COLUMN IF NOT EXISTS total_aperturas INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_clics INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_desuscritos INTEGER DEFAULT 0;

-- Habilitar RLS
ALTER TABLE public.admin_correos_destinatarios ENABLE ROW LEVEL SECURITY;

-- Política de acceso para super_admin
CREATE POLICY "super_admin_all_admin_correos_destinatarios" ON public.admin_correos_destinatarios
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

-- Índices de optimización
CREATE INDEX IF NOT EXISTS idx_admin_correos_dest_correo_id ON public.admin_correos_destinatarios(correo_id);
CREATE INDEX IF NOT EXISTS idx_admin_correos_dest_track_token ON public.admin_correos_destinatarios(track_token);
CREATE INDEX IF NOT EXISTS idx_admin_correos_dest_email ON public.admin_correos_destinatarios(email);
