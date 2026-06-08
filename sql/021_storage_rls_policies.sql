-- =====================================================================
-- Migración 021 — Políticas RLS en Storage
-- Calculadora de Reúso V14.8 | 2026-06-08
-- Ejecutar en Supabase → SQL Editor
-- =====================================================================
-- Buckets privados: documentos, dpp, firmas, cotizador
-- Buckets públicos: logos (no se tocan aquí)
-- NOTA: adminClient (service_role) siempre bypassea RLS — estas
-- políticas protegen el acceso directo con el anon/authenticated key.
-- =====================================================================

-- ── BUCKET: cotizador ────────────────────────────────────────────────
-- Path pattern: cotizador/{empresa_id}/{uuid}.webp
-- (storage.foldername(name))[1] = 'cotizador'
-- (storage.foldername(name))[2] = empresa_id

DROP POLICY IF EXISTS "cotizador_read_empresa"   ON storage.objects;
DROP POLICY IF EXISTS "cotizador_super_admin_all" ON storage.objects;

CREATE POLICY "cotizador_read_empresa"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cotizador' AND
    (storage.foldername(name))[2] = (
      SELECT empresa_id::text FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "cotizador_super_admin_all"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'cotizador' AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin')
  )
  WITH CHECK (
    bucket_id = 'cotizador' AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin')
  );

-- ── BUCKET: dpp ──────────────────────────────────────────────────────
-- Path pattern A (ingestas): dpp/ingestas/{empresa_id}/{activo_id}/file
-- (storage.foldername(name))[3] = empresa_id
-- Path pattern B (imágenes): dpp/imagenes/{timestamp}.webp
-- Sin empresa_id en el path → cualquier empleado autenticado con empresa puede leer

DROP POLICY IF EXISTS "dpp_read_empresa"    ON storage.objects;
DROP POLICY IF EXISTS "dpp_super_admin_all" ON storage.objects;

CREATE POLICY "dpp_read_empresa"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'dpp' AND (
      -- Ingestas: dpp/ingestas/{empresa_id}/...
      (
        (storage.foldername(name))[2] = 'ingestas' AND
        (storage.foldername(name))[3] = (
          SELECT empresa_id::text FROM profiles WHERE user_id = auth.uid()
        )
      )
      OR
      -- Imágenes de activos: dpp/imagenes/{timestamp}.webp
      -- Protección real = signed URLs de corta duración
      (
        (storage.foldername(name))[2] = 'imagenes' AND
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND empresa_id IS NOT NULL)
      )
    )
  );

CREATE POLICY "dpp_super_admin_all"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'dpp' AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin')
  )
  WITH CHECK (
    bucket_id = 'dpp' AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin')
  );

-- ── BUCKET: firmas ───────────────────────────────────────────────────
-- Solo super_admin (firma global del sistema, sin empresa_id en el path)

DROP POLICY IF EXISTS "firmas_super_admin_only" ON storage.objects;

CREATE POLICY "firmas_super_admin_only"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'firmas' AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin')
  )
  WITH CHECK (
    bucket_id = 'firmas' AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin')
  );

-- ── BUCKET: documentos ──────────────────────────────────────────────
-- Path pattern empresa: certificados/empresa/{empresa_id}/file.pdf
-- Path pattern usuario: certificados/usuario/{user_id}/file.pdf
-- (storage.foldername(name))[1] = 'certificados'
-- (storage.foldername(name))[2] = 'empresa' | 'usuario'
-- (storage.foldername(name))[3] = empresa_id | user_id

DROP POLICY IF EXISTS "documentos_read_propietario" ON storage.objects;
DROP POLICY IF EXISTS "documentos_super_admin_all"  ON storage.objects;

CREATE POLICY "documentos_read_propietario"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos' AND (
      -- Documentos de empresa: solo miembros de esa empresa
      (
        (storage.foldername(name))[2] = 'empresa' AND
        (storage.foldername(name))[3] = (
          SELECT empresa_id::text FROM profiles WHERE user_id = auth.uid()
        )
      )
      OR
      -- Documentos personales: solo el propio usuario
      (
        (storage.foldername(name))[2] = 'usuario' AND
        (storage.foldername(name))[3] = auth.uid()::text
      )
    )
  );

CREATE POLICY "documentos_super_admin_all"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'documentos' AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin')
  )
  WITH CHECK (
    bucket_id = 'documentos' AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin')
  );
