-- ============================================================
-- Renombra las políticas RLS que decían "Super admin"/"Super admins"
-- (con espacio) a "Superadmin"/"Superadmins" (una sola palabra), para
-- que coincidan con el texto ya normalizado en toda la UI. ALTER POLICY
-- RENAME TO no toca USING/WITH CHECK ni el rol afectado, solo el nombre.
--
-- Cada renombrado se hace solo si la política existe con ese nombre
-- EXACTO (puede haber quedado distinta a como está en el archivo .sql
-- original si alguien la ajustó a mano en el dashboard). Si no la
-- encuentra, avisa con RAISE NOTICE y sigue con las demás, en vez de
-- fallar toda la migración por una sola política que no calza.
-- ============================================================

DO $$
DECLARE
  r record;
  renombres text[][] := ARRAY[
    ARRAY['contenido_legal', 'Super admin edita contenido legal', 'Superadmin edita contenido legal'],
    ARRAY['log_firmas_confidencialidad', 'Super admins pueden ver log_firmas_confidencialidad', 'Superadmins pueden ver log_firmas_confidencialidad'],
    ARRAY['leads', 'Super admins pueden ver leads', 'Superadmins pueden ver leads'],
    ARRAY['leads', 'Super admins pueden actualizar leads', 'Superadmins pueden actualizar leads'],
    ARRAY['modulos', 'Super admin gestiona módulos', 'Superadmin gestiona módulos'],
    ARRAY['modulos_empresas', 'Super admin gestiona modulos_empresas', 'Superadmin gestiona modulos_empresas'],
    ARRAY['modulos_usuarios', 'Super admin gestiona todos los modulos_usuarios', 'Superadmin gestiona todos los modulos_usuarios'],
    ARRAY['lineas_negocio', 'Super admin acceso total lineas_negocio', 'Superadmin acceso total lineas_negocio'],
    ARRAY['lineas_negocio_empresas', 'Super admin acceso total lineas_negocio_empresas', 'Superadmin acceso total lineas_negocio_empresas'],
    ARRAY['contenido_landing', 'Super admin edita contenido', 'Superadmin edita contenido'],
    ARRAY['plantillas_documentos', 'Super admin gestiona plantillas', 'Superadmin gestiona plantillas']
  ];
  fila text[];
BEGIN
  FOREACH fila SLICE 1 IN ARRAY renombres
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = fila[1] AND policyname = fila[2]
    ) THEN
      EXECUTE format('ALTER POLICY %I ON public.%I RENAME TO %I', fila[2], fila[1], fila[3]);
      RAISE NOTICE 'Renombrada: % -> % (tabla %)', fila[2], fila[3], fila[1];
    ELSIF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = fila[1] AND policyname = fila[3]
    ) THEN
      RAISE NOTICE 'Ya estaba renombrada, se omite: % (tabla %)', fila[3], fila[1];
    ELSE
      RAISE NOTICE 'NO ENCONTRADA, revisar a mano: "%" en tabla % (nombre real puede ser distinto)', fila[2], fila[1];
    END IF;
  END LOOP;
END $$;
