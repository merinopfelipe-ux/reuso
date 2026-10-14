-- 148: Versión corregida de eliminar_empresa_definitiva (reemplaza la 147).
--
-- Corrige el bloqueo de la 147: solo cubría tablas con FK directa a empresas.
-- Las tablas que cuelgan de otra tabla de la empresa (tickets_mensajes,
-- dpp_ciclos, dpp_verificaciones, crm_muebles_cotizados, etc.) no se borraban
-- y la base lo rechazaba. Ahora la función calcula el cierre completo: toda
-- tabla que apunta, directa o indirectamente, a la empresa.
--
-- Reglas que no cambian:
--   · Una sola transacción. Si algo falla, no se borra nada.
--   · Ítems del catálogo (public.items) no se borran: solo pierden el vínculo.
--   · Perfiles (public.profiles) se borran al final. Las cuentas de acceso
--     (auth.users) las borra la API después.
--   · Solo service_role puede ejecutarla.
--   · p_solo_contar = true solo cuenta lo que se borraría.
--
-- Referencias de usuario con borrado en cascada (p. ej. informes personales):
-- se van solas al borrar la cuenta; sus archivos ya están en el manifiesto de Storage.
--
-- Cambio de seguridad: si una referencia obligatoria de un usuario está en una
-- tabla que no es de la empresa (p. ej. autoría de contenido global), ya no
-- se borra la fila en silencio. La función se detiene y dice qué tabla es.
--
-- Expandir-contraer: reemplaza una función, no cambia tablas.

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
  v_nuevas int;
  v_resumen jsonb := '{}'::jsonb;
  v_resumen_ajenas jsonb := '{}'::jsonb;
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

  -- ── Cierre: tablas de la empresa y cómo encontrar sus filas ─────────────
  -- filtro = condición sobre la tabla que, con $1 = empresa, selecciona sus filas.
  create temp table if not exists t_cierre (
    tabla_oid oid primary key,
    esquema text not null,
    tabla text not null,
    filtro text not null
  ) on commit drop;
  -- Supabase rechaza DELETE sin WHERE (protección pg_safeupdate), por eso el "where true".
  delete from t_cierre where true;

  -- Nivel 1: tablas con FK directa a empresas.
  insert into t_cierre
  select cl.oid, n.nspname, cl.relname, format('%I = $1', a.attname)
  from pg_constraint c
  join pg_class cl on cl.oid = c.conrelid
  join pg_namespace n on n.oid = cl.relnamespace
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
  where c.contype = 'f' and array_length(c.conkey, 1) = 1
    and c.confrelid = 'public.empresas'::regclass
    and n.nspname = 'public'
    and cl.relname not in ('items', 'profiles', 'empresas')
  on conflict do nothing;

  -- Niveles siguientes: tablas que apuntan a una tabla ya incluida.
  loop
    v_nuevas := 0;
    for v_tabla in
      select cl.oid as tabla_oid, n.nspname as esquema, cl.relname as tabla,
             format('%I in (select %I from %I.%I where %s)',
                    a.attname, pa.attname, p.esquema, p.tabla, p.filtro) as filtro
      from pg_constraint c
      join t_cierre p on p.tabla_oid = c.confrelid
      join pg_class cl on cl.oid = c.conrelid
      join pg_namespace n on n.oid = cl.relnamespace
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      join pg_attribute pa on pa.attrelid = c.confrelid and pa.attnum = c.confkey[1]
      where c.contype = 'f' and array_length(c.conkey, 1) = 1
        and n.nspname = 'public'
        and cl.relname not in ('items', 'profiles', 'empresas')
        and not exists (select 1 from t_cierre x where x.tabla_oid = c.conrelid)
    loop
      insert into t_cierre values (v_tabla.tabla_oid, v_tabla.esquema, v_tabla.tabla, v_tabla.filtro)
      on conflict do nothing;
      v_nuevas := v_nuevas + 1;
    end loop;
    exit when v_nuevas = 0;
  end loop;

  -- Caminos adicionales: una tabla puede llegar a la empresa por más de una
  -- clave (p. ej. dpp_ciclos apunta a empresas Y a dpp_activos). Se suman con
  -- OR para no dejar filas por no haber seguido todos los caminos. Cada camino
  -- ya incluido (su texto ya está en el filtro) se omite. La consulta se evalúa
  -- una sola vez, así que no hay recursión.
  for v_tabla in
    select h.tabla_oid,
           format('%I in (select %I from %I.%I where %s)',
                  a.attname, pa.attname, p.esquema, p.tabla, p.filtro) as filtro
    from pg_constraint c
    join t_cierre p on p.tabla_oid = c.confrelid
    join t_cierre h on h.tabla_oid = c.conrelid
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_attribute pa on pa.attrelid = c.confrelid and pa.attnum = c.confkey[1]
    where c.contype = 'f' and array_length(c.conkey, 1) = 1
      and p.tabla_oid <> h.tabla_oid
      and position(format('%I in (select %I from %I.%I where %s)',
                          a.attname, pa.attname, p.esquema, p.tabla, p.filtro) in h.filtro) = 0
  loop
    update t_cierre set filtro = filtro || ' or ' || v_tabla.filtro
    where tabla_oid = v_tabla.tabla_oid;
  end loop;

  -- ── Modo conteo: no toca nada ───────────────────────────────────────────
  if p_solo_contar then
    for v_tabla in select * from t_cierre order by tabla loop
      execute format('select count(*) from %I.%I where %s', v_tabla.esquema, v_tabla.tabla, v_tabla.filtro)
        into v_cuenta using p_empresa;
      if v_cuenta > 0 then
        v_resumen := v_resumen || jsonb_build_object(v_tabla.tabla, v_cuenta);
      end if;
    end loop;
    return jsonb_build_object(
      'empresa', v_nombre,
      'usuarios', coalesce(array_length(v_usuarios, 1), 0),
      'filas', v_resumen
    );
  end if;

  -- ── Paso 1: referencias de los usuarios en tablas que NO son de la empresa ──
  for v_tabla in
    select n.nspname as esquema, cl.relname as tabla, a.attname as columna,
           a.attnotnull as obligatoria, (c.confrelid = 'public.profiles'::regclass) as apunta_a_perfil
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and array_length(c.conkey, 1) = 1
      and c.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass)
      and n.nspname = 'public'
      and cl.relname <> 'profiles'
      -- Las que borran en cascada se van solas al borrar la cuenta: no se tocan aquí.
      and c.confdeltype <> 'c'
      and not exists (select 1 from t_cierre x where x.tabla_oid = c.conrelid)
  loop
    v_ids := case when v_tabla.apunta_a_perfil then v_perfiles else v_usuarios end;
    if v_tabla.obligatoria then
      -- No se borra en silencio una fila ajena: se detiene y se dice cuál es.
      execute format('select count(*) from %I.%I where %I = any($1)', v_tabla.esquema, v_tabla.tabla, v_tabla.columna)
        into v_cuenta using v_ids;
      if v_cuenta > 0 then
        raise exception 'No se puede eliminar la empresa: un usuario es referencia obligatoria en %', v_tabla.tabla;
      end if;
    else
      execute format('update %I.%I set %I = null where %I = any($1)', v_tabla.esquema, v_tabla.tabla, v_tabla.columna, v_tabla.columna)
        using v_ids;
      get diagnostics v_filas = row_count;
      if v_filas > 0 then
        v_resumen_ajenas := v_resumen_ajenas || jsonb_build_object(v_tabla.tabla, v_filas);
      end if;
    end if;
  end loop;

  -- ── Paso 2: filas de la empresa, en pasadas ─────────────────────────────
  -- Las tablas se referencian entre sí, así que el orden importa. Cada pasada
  -- intenta todas; las que fallan por una referencia pendiente se reintentan.
  loop
    v_pasada := v_pasada + 1;
    v_bloqueadas := '{}';

    for v_tabla in select * from t_cierre order by tabla loop
      begin
        execute format('delete from %I.%I where %s', v_tabla.esquema, v_tabla.tabla, v_tabla.filtro)
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
    if v_pasada >= 10 then
      raise exception 'No se puede eliminar la empresa: siguen referencias en %', array_to_string(v_bloqueadas, ', ');
    end if;
  end loop;

  -- ── Paso 3: perfiles de los miembros ────────────────────────────────────
  delete from public.profiles where empresa_id = p_empresa;

  -- ── Paso 4: la empresa (los ítems del catálogo quedan sin vínculo) ──────
  delete from public.empresas where id = p_empresa;

  return jsonb_build_object(
    'empresa', v_nombre,
    'usuarios', v_usuarios,
    'filas', v_resumen,
    'referencias_ajenas', v_resumen_ajenas
  );
end;
$$;

revoke all on function public.eliminar_empresa_definitiva(uuid, boolean) from public, anon, authenticated;
grant execute on function public.eliminar_empresa_definitiva(uuid, boolean) to service_role;
