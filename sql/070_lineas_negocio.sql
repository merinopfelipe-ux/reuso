-- sql/070_lineas_negocio.sql

-- 1. Crear tabla lineas_negocio
CREATE TABLE public.lineas_negocio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave VARCHAR NOT NULL UNIQUE,
    nombre VARCHAR NOT NULL,
    icono_lucide VARCHAR DEFAULT 'Box' NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT true NOT NULL,
    orden INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Crear tabla lineas_negocio_empresas (pivote)
CREATE TABLE public.lineas_negocio_empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    linea_negocio_id UUID NOT NULL REFERENCES public.lineas_negocio(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    activa BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(linea_negocio_id, empresa_id)
);

-- 3. Habilitar RLS
ALTER TABLE public.lineas_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineas_negocio_empresas ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para lineas_negocio
-- Todo el mundo (autenticado) puede leer las líneas de negocio activas
CREATE POLICY "Lectura pública de lineas de negocio"
ON public.lineas_negocio FOR SELECT
TO authenticated
USING (true);

-- Super admin puede todo (asumiendo que las politicas de super admin ya cubren esto por bypass rls)
-- Si no:
CREATE POLICY "Super admin acceso total lineas_negocio"
ON public.lineas_negocio FOR ALL
TO authenticated
USING (
  (SELECT rol FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
);

-- 5. Políticas para lineas_negocio_empresas
-- Un usuario solo puede ver las líneas asignadas a su empresa
CREATE POLICY "Usuarios ven lineas de su empresa"
ON public.lineas_negocio_empresas FOR SELECT
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Super admin acceso total lineas_negocio_empresas"
ON public.lineas_negocio_empresas FOR ALL
TO authenticated
USING (
  (SELECT rol FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
);

-- Trigger updated_at
CREATE TRIGGER handle_updated_at_lineas_negocio
  BEFORE UPDATE ON public.lineas_negocio
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. Seed inicial: Muebles
INSERT INTO public.lineas_negocio (clave, nombre, icono_lucide, descripcion, orden)
VALUES ('muebles', 'Muebles', 'Armchair', 'Línea de mobiliario y productos de madera', 1)
ON CONFLICT (clave) DO NOTHING;
