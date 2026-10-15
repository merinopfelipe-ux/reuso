-- 154: El correo de cada perfil es siempre el de su cuenta de acceso, y nunca queda vacío.
--
-- Sin correo no se puede invitar, ni sumar al chat, ni mandar avisos. Esta migración:
--   1. Hace que un cambio de correo en la cuenta de acceso se copie al perfil.
--   2. Repara hoy los perfiles que tengan un correo distinto o vacío.
--   3. Impide guardar un perfil sin correo (la comprobación se aplica a filas nuevas
--      y a las que se editen; las existentes ya fueron reparadas en el punto 2).
--
-- Expandir-contraer: no borra columnas ni filas. Se corre a mano en el SQL Editor
-- (staging primero, luego producción). Una sentencia por vez.

-- 1. Sincronización del correo desde la cuenta de acceso.
CREATE OR REPLACE FUNCTION public.sincronizar_email_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = NEW.email WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sincronizar_email_perfil ON auth.users;
CREATE TRIGGER trg_sincronizar_email_perfil
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_email_perfil();

-- 2. Reparación de perfiles desalineados o vacíos.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.user_id
  AND u.email IS NOT NULL
  AND p.email IS DISTINCT FROM u.email;

-- 3. Un perfil no puede quedar sin correo.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_email_obligatorio CHECK (btrim(email) <> '') NOT VALID;
