-- Migración 028 — Vincular empresa por código al registrarse
-- Calculadora de Reúso | 2026-06-16

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa_id UUID;
  v_rol TEXT := 'usuario_libre';
  v_codigo TEXT;
BEGIN
  -- Extraer código de empresa desde la metadata del usuario y normalizar
  v_codigo := upper(trim(NEW.raw_user_meta_data->>'codigo_empresa'));
  
  -- Si el código existe, buscar la empresa activa correspondiente
  IF v_codigo IS NOT NULL AND v_codigo <> '' THEN
    SELECT id INTO v_empresa_id 
    FROM public.empresas 
    WHERE codigo_registro = v_codigo 
      AND activa = true 
    LIMIT 1;
    
    -- Si la empresa existe y está activa, asignar el rol de empleado
    IF v_empresa_id IS NOT NULL THEN
      v_rol := 'empleado';
    END IF;
  END IF;

  -- Insertar el perfil del usuario con los campos correspondientes
  INSERT INTO public.profiles (
    user_id, 
    email, 
    nombre, 
    apellido, 
    apodo, 
    telefono, 
    legal_aceptado_en, 
    empresa_id, 
    rol
  )
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
    )::timestamptz,
    v_empresa_id,
    v_rol
  );
  RETURN NEW;
END;
$$;
