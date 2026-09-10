-- =====================================================================
-- Migración 125 — Depósito de capturas del QA
-- Calculadora de Reúso | 2026-09-10
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================
-- Bucket privado para las capturas de pantalla que el super_admin adjunta
-- a cada prueba en /admin/qa. Solo se accede vía la API con service_role
-- (createAdminClient), que bypasea RLS — las políticas de abajo son
-- defensa en profundidad para el acceso directo con el key authenticated.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'qa-evidencias',
  'qa-evidencias',
  false,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "qa_evidencias_super_admin_all" on storage.objects;

create policy "qa_evidencias_super_admin_all"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'qa-evidencias'
    and exists (select 1 from profiles where user_id = auth.uid() and rol = 'super_admin')
  )
  with check (
    bucket_id = 'qa-evidencias'
    and exists (select 1 from profiles where user_id = auth.uid() and rol = 'super_admin')
  );
