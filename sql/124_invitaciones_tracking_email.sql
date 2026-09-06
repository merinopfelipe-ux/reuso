-- Tracking real de apertura/clic del correo de invitación (arquitectura de
-- correos 2026-09-06): permite al empresa_admin ver en /empresa/equipo si la
-- persona invitada ya abrió el correo o hizo clic en el link de aceptar,
-- alimentado por el webhook de Resend (email.opened / email.clicked).
-- resend_email_id es el identificador que Resend devuelve al enviar — es la
-- forma confiable de saber a cuál invitación corresponde cada evento del
-- webhook (nunca se hace match por email/fecha, que puede repetirse).
ALTER TABLE invitaciones
  ADD COLUMN IF NOT EXISTS resend_email_id text,
  ADD COLUMN IF NOT EXISTS abierta_at timestamptz,
  ADD COLUMN IF NOT EXISTS clic_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_invitaciones_resend_email_id ON invitaciones(resend_email_id);
