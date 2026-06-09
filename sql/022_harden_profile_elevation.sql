-- =====================================================================
-- Migración 022 — Correcciones de Seguridad y Base de Datos en Profiles
-- Calculadora de Reúso | 2026-06-08
-- Ejecutar completo en Supabase → SQL Editor
-- =====================================================================

-- 1. CORRECCIÓN DEL TRIGGER DE NUEVO USUARIO
-- Corrige el error de columna 'acepta_terminos_at' inexistente usando 'legal_aceptado_en'.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nombre, apellido, apodo, telefono, legal_aceptado_en)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(COALESCE(NEW.email, ''), '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    NEW.raw_user_meta_data->>'apodo',
    NEW.raw_user_meta_data->>'telefono',
    COALESCE(
      NEW.raw_user_meta_data->>'legal_aceptado_en',
      NEW.raw_user_meta_data->>'acepta_terminos_at'
    )::timestamptz
  );
  RETURN NEW;
END;
$$;

-- 2. HARDENING DE SEGURIDAD CONTRA ELEVACIÓN DE PRIVILEGIOS
-- Impide a usuarios con rol 'authenticated' o 'anon' alterar el 'rol' o la 'empresa_id' de su perfil.
CREATE OR REPLACE FUNCTION check_profile_privilege_elevation()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la sesión proviene de un cliente de la aplicación (authenticated o anon)
  IF (current_setting('role', true) IN ('authenticated', 'anon')) THEN
    -- Bloquear cualquier cambio en 'rol' o en 'empresa_id'
    IF NEW.rol <> OLD.rol OR NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
      RAISE EXCEPTION 'No tienes permisos para modificar el rol o la empresa de tu perfil.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_profile_elevation ON profiles;
CREATE TRIGGER trg_prevent_profile_elevation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION check_profile_privilege_elevation();
