-- ============================================================
-- Calculadora de Reúso — Migración V1.1 (Teléfonos)
-- ============================================================

-- Agregar el campo telefono a la tabla profiles. 
-- Lo permitimos en nulo (NULL) para no romper los perfiles existentes.
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS telefono text;

-- Actualizamos el trigger para que cuando un usuario nuevo se registre, 
-- inserte también el teléfono (si se envió encriptado en el registro, bajará encriptado).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nombre, telefono, acepta_terminos_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data->>'telefono',
    CASE
      WHEN NEW.raw_user_meta_data->>'acepta_terminos_at' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'acepta_terminos_at')::timestamptz
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;
