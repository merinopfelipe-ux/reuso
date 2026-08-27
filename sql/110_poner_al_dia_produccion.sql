-- ============================================================
-- 110 — Poner la base de producción al día
-- ============================================================
-- Generado el 2026-08-26 comparando el esquema real de producción contra el
-- proyecto de pruebas (que sí tiene las 95 migraciones aplicadas).
--
-- Recoge lo que quedó escrito en `sql/` pero nunca se corrió en la base real:
--   · tabla  firmas_solicitudes             (sql/038)  -> firma de confidencialidad
--   · tabla  admin_correos_destinatarios    (sql/104)  -> seguimiento de correos
--   · cols   admin_correos_enviados.total_* (sql/104)
--   · cols   calculos.hash_previo/hash_interno (sql/005) -> cadena de integridad
--   · col    profiles.acepta_terminos_at    (sql/001)
--
-- Es seguro repetirlo: todo va con IF NOT EXISTS y cada política se borra
-- antes de recrearse. No borra ni modifica ningún dato existente.
-- ============================================================

-- ─── de sql/005: cadena de integridad de los cálculos ───
ALTER TABLE calculos ADD COLUMN IF NOT EXISTS hash_previo text;
ALTER TABLE calculos ADD COLUMN IF NOT EXISTS hash_interno text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_calculos_hash_chain ON calculos(empresa_id, created_at DESC) WHERE empresa_id IS NOT NULL;

-- ─── de sql/001: fecha de aceptación de términos ───
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS acepta_terminos_at timestamptz;

-- ─── sql/038 completa: firma de confidencialidad ───
-- Rediseño del sistema de firmas legales: de enlace público abierto a
-- invitación cerrada, de un solo uso, iniciada exclusivamente por el
-- super_admin. Arquitectura escalable a otros documentos además del Acuerdo
-- de Confidencialidad (tipo_documento es texto libre, validado en la app
-- contra el registro de src/lib/firmas/documentos.ts, no con un CHECK aquí,
-- para no requerir una migración nueva cada vez que se agregue un documento).
--
-- El token NUNCA se guarda en texto plano (mismo criterio que las
-- invitaciones de empleados): se guarda su hash SHA-256. El token real solo
-- vive en la URL que recibe el destinatario por correo.
--
-- Toda la tabla se opera exclusivamente desde rutas server-side con
-- adminClient (service role): el panel /admin/firmas y la página pública
-- /legal/firma/[token] nunca consultan esta tabla desde el navegador, así que
-- no hace falta ninguna policy pública — solo super_admin.

CREATE TABLE IF NOT EXISTS firmas_solicitudes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_documento    text NOT NULL,
  nombre            text NOT NULL,
  numero_identidad  text NOT NULL,
  email             text NOT NULL,
  token_hash        text UNIQUE NOT NULL,
  estado            text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'firmado')),
  enviado_por       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expira_at         timestamptz NOT NULL,
  firmado_at        timestamptz,
  indicativo        text,
  telefono          text,
  ip_address        text,
  user_agent        text,
  pdf_path          text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firmas_solicitudes_token_hash ON firmas_solicitudes(token_hash);
CREATE INDEX IF NOT EXISTS idx_firmas_solicitudes_estado ON firmas_solicitudes(estado);

ALTER TABLE firmas_solicitudes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firmas_solicitudes_super_admin" ON public.firmas_solicitudes;
CREATE POLICY "firmas_solicitudes_super_admin"
  ON firmas_solicitudes FOR ALL
  USING (get_my_rol() = 'super_admin');

-- ─── sql/104 completa: seguimiento de correos ───
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
DROP POLICY IF EXISTS "super_admin_all_admin_correos_destinatarios" ON public.admin_correos_destinatarios;
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
