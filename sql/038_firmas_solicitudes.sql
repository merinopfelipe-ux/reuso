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

CREATE POLICY "firmas_solicitudes_super_admin"
  ON firmas_solicitudes FOR ALL
  USING (get_my_rol() = 'super_admin');
