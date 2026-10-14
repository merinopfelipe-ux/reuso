-- 153: Chat propio por empresa.
--
-- El super admin elige qué empresas tienen chat (hoy: Lurdes y Calculadora Fan).
-- Al activarlo, la aplicación crea una cuenta en Chatwoot para la empresa y
-- agrega a su administrador. Estas dos columnas guardan ese estado.
--
--   chat_habilitado  · si la empresa ve la entrada Chat en su menú.
--   chat_account_id  · id de la cuenta en Chatwoot. Se conserva aunque el chat
--                      se quite, para no perder conversaciones al volver a activarlo.
--
-- Expandir-contraer: solo ADD COLUMN IF NOT EXISTS. No cambia filas existentes
-- (chat_habilitado queda en false para todas las empresas).
-- Se corre a mano en el SQL Editor (staging primero).

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS chat_habilitado boolean NOT NULL DEFAULT false;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS chat_account_id integer;
