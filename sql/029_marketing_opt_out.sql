-- sql/029_marketing_opt_out.sql
-- Infraestructura de baja de correos de marketing

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS marketing_opt_out BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Índice para lookup rápido por token (la API busca por este campo)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_unsubscribe_token_idx
  ON profiles (unsubscribe_token);

-- Comentarios descriptivos
COMMENT ON COLUMN profiles.marketing_opt_out IS 'true si el usuario solicitó no recibir correos de marketing';
COMMENT ON COLUMN profiles.unsubscribe_token IS 'Token opaco de un solo uso para baja de marketing. Se rota tras cada uso.';
