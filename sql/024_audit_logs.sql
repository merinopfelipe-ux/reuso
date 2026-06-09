-- 1. Alterar tabla profiles para soportar auditoría selectiva
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_audited BOOLEAN NOT NULL DEFAULT false;

-- 2. Crear la tabla de audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_id UUID,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    ip_address TEXT,
    log_level TEXT NOT NULL CHECK (log_level IN ('DEBUG', 'INFO', 'WARNING', 'CRITICAL')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Crear índices para optimizar búsquedas y filtrados rápidos
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level_status ON public.audit_logs(log_level, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- 4. Crear la función del trigger inteligente
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con privilegios del creador (bypass RLS al insertar logs de auditoría)
AS $$
DECLARE
    v_user_id uuid;
    v_is_audited boolean := false;
    v_ip text;
    v_log_level text;
    v_entity_id uuid;
    v_metadata jsonb := '{}'::jsonb;
    v_table text := TG_TABLE_NAME;
    v_action text := TG_OP;
    v_status text := 'SUCCESS';
BEGIN
    -- Determinar el ID del usuario autenticado actual
    v_user_id := auth.uid();

    -- Comprobar si el usuario tiene auditoría forzada (is_audited = true)
    IF v_user_id IS NOT NULL THEN
        SELECT COALESCE(is_audited, false)
        INTO v_is_audited
        FROM public.profiles
        WHERE user_id = v_user_id;
    END IF;

    -- Obtener la dirección IP del cliente desde los headers de Supabase
    BEGIN
        v_ip := current_setting('request.headers', true)::json->>'x-forwarded-for';
        IF v_ip LIKE '%,%' THEN
            v_ip := split_part(v_ip, ',', 1); -- Tomar el primer IP de la cadena si hay proxies
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
    END;
    v_ip := COALESCE(v_ip, '127.0.0.1');

    -- Obtener el ID de la entidad afectada
    IF TG_OP = 'DELETE' THEN
        BEGIN
            v_entity_id := OLD.id;
        EXCEPTION WHEN OTHERS THEN
            v_entity_id := NULL;
        END;
        v_metadata := jsonb_build_object('old_data', to_jsonb(OLD));
    ELSE
        BEGIN
            v_entity_id := NEW.id;
        EXCEPTION WHEN OTHERS THEN
            v_entity_id := NULL;
        END;
        
        IF TG_OP = 'INSERT' THEN
            v_metadata := jsonb_build_object('new_data', to_jsonb(NEW));
        ELSIF TG_OP = 'UPDATE' THEN
            v_metadata := jsonb_build_object('old_data', to_jsonb(OLD), 'new_data', to_jsonb(NEW));
        END IF;
    END IF;

    -- Determinar el log_level
    IF v_is_audited THEN
        v_log_level := 'DEBUG';
    ELSE
        -- Niveles de log según la gravedad del cambio
        IF TG_OP = 'DELETE' THEN
            v_log_level := 'CRITICAL';
        ELSIF TG_OP = 'UPDATE' THEN
            v_log_level := 'WARNING';
        ELSE
            v_log_level := 'INFO';
        END IF;
    END IF;

    -- Registrar log de auditoría
    INSERT INTO public.audit_logs (
        user_id,
        table_name,
        action,
        entity_id,
        status,
        ip_address,
        log_level,
        metadata
    ) VALUES (
        v_user_id,
        v_table,
        v_action,
        v_entity_id,
        v_status,
        v_ip,
        v_log_level,
        v_metadata
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 5. Crear Triggers condicionales usando un bloque anónimo (DO)
DO $$
BEGIN
    -- Aplicar a profiles (perfiles)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
        CREATE TRIGGER trg_audit_profiles
        AFTER INSERT OR UPDATE OR DELETE ON public.profiles
        FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;

    -- Aplicar a pedidos (si existe)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pedidos') THEN
        DROP TRIGGER IF EXISTS trg_audit_pedidos ON public.pedidos;
        CREATE TRIGGER trg_audit_pedidos
        AFTER INSERT OR UPDATE OR DELETE ON public.pedidos
        FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;

    -- Aplicar a documentos (si existe)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documentos') THEN
        DROP TRIGGER IF EXISTS trg_audit_documentos ON public.documentos;
        CREATE TRIGGER trg_audit_documentos
        AFTER INSERT OR UPDATE OR DELETE ON public.documentos
        FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;

    -- Aplicar a calculos (tabla crítica existente en Reúso)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calculos') THEN
        DROP TRIGGER IF EXISTS trg_audit_calculos ON public.calculos;
        CREATE TRIGGER trg_audit_calculos
        AFTER INSERT OR UPDATE OR DELETE ON public.calculos
        FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;
    
    -- Aplicar a certificados (tabla crítica existente en Reúso)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'certificados') THEN
        DROP TRIGGER IF EXISTS trg_audit_certificados ON public.certificados;
        CREATE TRIGGER trg_audit_certificados
        AFTER INSERT OR UPDATE OR DELETE ON public.certificados
        FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;
END $$;

-- 6. Configurar la política de retención automática (pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Eliminar de forma segura cualquier job previo con el mismo nombre para evitar duplicaciones
SELECT cron.unschedule('purge-audit-logs-job') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'purge-audit-logs-job'
);

-- Programar purga para todos los domingos a las 03:00 AM
SELECT cron.schedule(
    'purge-audit-logs-job',
    '0 3 * * 0',
    $$ DELETE FROM public.audit_logs WHERE created_at < now() - INTERVAL '3 months' $$
);

-- 7. Seguridad de los logs (RLS en audit_logs)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Denegar explícitamente UPDATE/DELETE
DROP POLICY IF EXISTS restrict_write_audit_logs ON public.audit_logs;
CREATE POLICY restrict_write_audit_logs ON public.audit_logs
AS RESTRICTIVE
FOR ALL
USING (false)
WITH CHECK (false);

-- Permitir lectura (SELECT) únicamente a service_role o super_admin
DROP POLICY IF EXISTS select_audit_logs ON public.audit_logs;
CREATE POLICY select_audit_logs ON public.audit_logs
FOR SELECT
TO authenticated, service_role
USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.rol = 'super_admin'
    )
);

-- 8. Dashboard de Seguridad (Vista vw_seguridad_resumen)
CREATE OR REPLACE VIEW public.vw_seguridad_resumen AS
SELECT
    created_at AS "Fecha",
    user_id AS "Usuario",
    action AS "Accion",
    log_level AS "Nivel",
    metadata AS "Detalles_Intrusion"
FROM
    public.audit_logs
WHERE
    log_level IN ('WARNING', 'CRITICAL')
    OR status = 'ERROR';
