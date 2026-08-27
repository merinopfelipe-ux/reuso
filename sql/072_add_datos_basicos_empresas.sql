-- Migración para añadir campos de datos básicos a la tabla empresas

ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS nit TEXT,
ADD COLUMN IF NOT EXISTS telefono TEXT,
ADD COLUMN IF NOT EXISTS pais TEXT,
ADD COLUMN IF NOT EXISTS ciudad TEXT,
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS sitio_web TEXT,
ADD COLUMN IF NOT EXISTS tamano_empresa TEXT;

-- Añadir comentario a las columnas para documentar en la base de datos
COMMENT ON COLUMN public.empresas.nit IS 'Número de Identificación Tributaria o equivalente (ej. RUT)';
COMMENT ON COLUMN public.empresas.telefono IS 'Teléfono corporativo o de contacto principal';
COMMENT ON COLUMN public.empresas.pais IS 'País de operación principal';
COMMENT ON COLUMN public.empresas.ciudad IS 'Ciudad de la sede principal';
COMMENT ON COLUMN public.empresas.direccion IS 'Dirección física principal de la empresa';
COMMENT ON COLUMN public.empresas.sitio_web IS 'Página web institucional';
COMMENT ON COLUMN public.empresas.tamano_empresa IS 'Tamaño aproximado (ej. número de empleados o rango de facturación)';
