-- Migración 027 — Código de registro de empresa
-- Permite vincular un usuario nuevo a su empresa mediante un código corto generado por el admin

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS codigo_registro TEXT UNIQUE;

-- Función pública para validar el código (sin exponer datos sensibles)
-- SECURITY DEFINER: corre con permisos del owner, no del llamante anónimo
CREATE OR REPLACE FUNCTION validar_codigo_empresa(p_codigo TEXT)
RETURNS TABLE(empresa_id UUID, nombre TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nombre
  FROM empresas
  WHERE codigo_registro = upper(trim(p_codigo))
    AND activa = true
  LIMIT 1;
$$;

-- Revocar acceso directo y exponer solo mediante la función
REVOKE ALL ON FUNCTION validar_codigo_empresa(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION validar_codigo_empresa(TEXT) TO anon, authenticated;
