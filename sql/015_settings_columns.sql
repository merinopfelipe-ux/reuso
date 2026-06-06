-- Migration 015: Agregar columnas faltantes en profiles para /settings
-- Ejecutar en Supabase → SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_color text DEFAULT '#D6F391';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_text  text DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notificaciones_json jsonb;

-- Actualizar trigger para insertar apellido y apodo al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nombre, apellido, apodo, acepta_terminos_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(COALESCE(NEW.email, ''), '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    NEW.raw_user_meta_data->>'apodo',
    CASE
      WHEN NEW.raw_user_meta_data->>'acepta_terminos_at' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'acepta_terminos_at')::timestamptz
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;
