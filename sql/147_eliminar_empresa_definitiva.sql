-- 147: Eliminar una empresa con todo lo asociado, en una sola transacción.
--
-- Qué borra:
--   · La empresa y todas las filas que apuntan a ella (CRM, DPP, cálculos,
--     certificados, tickets, integraciones, invitaciones, módulos, etc.).
--   · Los perfiles de sus miembros. Sus cuentas de acceso (auth.users) las
--     borra la API después, con la API de administración de Supabase.
--   · Las referencias de esos usuarios en tablas ajenas a la empresa (autoría
--     de contenido, asesores, etc.): se ponen en vacío, o se borra la fila si
--     la columna es obligatoria.
--
-- Qué NO borra:
--   · Ítems del catálogo (public.items). Solo pierden el vínculo con la
--     empresa (creado_por_empresa_id = null, como ya define su regla).
--
-- Seguridad:
--   · Todo corre en una sola transacción. Si cualquier paso falla, no se
--     borra nada.
--   · Solo service_role puede ejecutarla. La API de super_admin exige el
--     nombre exacto de la empresa antes de llamarla.
--   · Con p_solo_contar = true solo cuenta lo que se borraría, sin borrar.
--
-- Nota: profiles.id es la clave del perfil; profiles.user_id es la cuenta de
-- acceso (auth.users). Algunas tablas apuntan a una y otras a la otra, y la
-- función trata cada referencia con la columna correcta.
--
-- Expandir-contraer: es una función nueva. No cambia tablas existentes.

create or replace function public.eliminar_empresa_definitiva(
  p_empresa uuid,
  p_solo_contar boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_usuarios uuid[];   -- cuentas de acceso (profiles.user_id, auth.users)
  v_perfiles uuid[];   -- perfiles (profiles.id)
  v_ids uuid[];
  v_tabla record;
  v_filas bigint;
  v_cuenta bigint;
  v_resumen jsonb := '{}'::jsonb;
  v_resumen_cuentas jsonb := '{}'::jsonb;
  v_pasada int := 0;
  v_bloqueadas text[];
begin
  select nombre into v_nombre from public.empresas where id = p_empresa;
  if v_nombre is null then
    raise exception 'La empresa no existe';
  end if;

  select coalesce(array_agg(user_id), '{}'), coalesce(array_agg(id), '{}')
    into v_usuarios, v_perfiles
  from public.profiles where empresa_id = p_empresa;

  -- ── Modo conteo: no toca nada ───────────────────────────────────────────
  if p_solo_contar then
    for v_tabla in
      select n.nspname as esquema, cl.relname as tabla, a.attname as columna
      from pg_constraint c
      join pg_class cl on cl.oid = c.conrelid
      join pg_namespace n on n.oid = cl.relnamespace
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f' and array_length(c.conkey, 1) = 1
        and c.confrelid = 'public.empresas'::regclass
        and n.nspname = 'public'
        and cl.relname not in ('items', 'profiles')
    loop
      execute format('select count(*) from %I.%I where %I = $1', v_tabla.esquema, v_tabla.tabla, v_tabla.columna)
        into v_cuenta using p_empresa;
      if v_cuenta > 0 then
        v_resumen := v_resumen || jsonb_build_object(v_tabla.tabla, v_cuenta);
      end if;
    end loop;

    return jsonb_build_object(
      'empresa', v_nombre,
      'usuarios', coalesce(array_length(v_usuarios, 1), 0),
      'filas', v_resumen,
      'referencias_ajenas', v_resumen_cuentas
    );
  end if;

  -- ── Paso 1: referencias de los usuarios en tablas que NO son de la empresa ──
  -- Si la columna admite vacío, se pone en null. Si es obligatoria, se borra la fila.
  for v_tabla in
    select n.nspname as esquema, cl.relname as tabla, a.attname as columna, a.attnotnull as obligatoria,
      (c.confrelid = 'public.profiles'::regclass) as apunta_a_perfil
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and array_length(c.conkey, 1) = 1
      and c.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass)
      and n.nspname = 'public'
      and cl.relname <> 'profiles'
      and not exists (
        select 1 from pg_constraint c2
        where c2.conrelid = c.conrelid and c2.contype = 'f'
          and c2.confrelid = 'public.empresas'::regclass
      )
  loop
    -- Referencias a profiles(id) usan perfiles; las demás (auth.users) usan cuentas.
    v_ids := case when v_tabla.apunta_a_perfil then v_perfiles else v_usuarios end;
    if v_tabla.obligatoria then
      execute format('delete from %I.%I where %I = any($1)', v_tabla.esquema, v_tabla.tabla, v_tabla.columna)
        using v_ids;
      get diagnostics v_filas = row_count;
    else
      execute format('update %I.%I set %I = null where %I = any($1)', v_tabla.esquema, v_tabla.tabla, v_tabla.columna, v_tabla.columna)
        using v_ids;
      get diagnostics v_filas = row_count;
    end if;
    if v_filas > 0 then
      v_resumen_cuentas := v_resumen_cuentas || jsonb_build_object(v_tabla.tabla, v_filas);
    end if;
  end loop;

  -- ── Paso 2: filas de la empresa, en pasadas ─────────────────────────────
  -- Varias tablas se referencian entre sí, así que el orden importa. Cada
  -- pasada intenta borrar todas; si una falla por una referencia pendiente,
  -- se reintenta en la siguiente. Si después de varias pasadas sigue
  -- bloqueada, se aborta todo y se dice qué tabla bloquea.
  loop
    v_pasada := v_pasada + 1;
    v_bloqueadas := '{}';

    for v_tabla in
      select n.nspname as esquema, cl.relname as tabla, a.attname as columna
      from pg_constraint c
      join pg_class cl on cl.oid = c.conrelid
      join pg_namespace n on n.oid = cl.relnamespace
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f' and array_length(c.conkey, 1) = 1
        and c.confrelid = 'public.empresas'::regclass
        and n.nspname = 'public'
        and cl.relname not in ('items', 'profiles')
    loop
      begin
        execute format('delete from %I.%I where %I = $1', v_tabla.esquema, v_tabla.tabla, v_tabla.columna)
          using p_empresa;
        get diagnostics v_filas = row_count;
        if v_filas > 0 then
          v_resumen := v_resumen || jsonb_build_object(
            v_tabla.tabla, coalesce((v_resumen ->> v_tabla.tabla)::bigint, 0) + v_filas
          );
        end if;
      exception when foreign_key_violation then
        v_bloqueadas := array_append(v_bloqueadas, v_tabla.tabla);
      end;
    end loop;

    exit when coalesce(array_length(v_bloqueadas, 1), 0) = 0;
    if v_pasada >= 8 then
      raise exception 'No se puede eliminar la empresa: siguen referencias en %', array_to_string(v_bloqueadas, ', ');
    end if;
  end loop;

  -- ── Paso 3: perfiles de los miembros ────────────────────────────────────
  delete from public.profiles where empresa_id = p_empresa;

  -- ── Paso 4: la empresa ──────────────────────────────────────────────────
  delete from public.empresas where id = p_empresa;

  return jsonb_build_object(
    'empresa', v_nombre,
    'usuarios', v_usuarios,
    'filas', v_resumen,
    'referencias_ajenas', v_resumen_cuentas
  );
end;
$$;

revoke all on function public.eliminar_empresa_definitiva(uuid, boolean) from public, anon, authenticated;
grant execute on function public.eliminar_empresa_definitiva(uuid, boolean) to service_role;
