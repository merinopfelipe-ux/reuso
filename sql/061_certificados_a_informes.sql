-- ============================================================
-- Eliminación del sistema de Certificados — Informes queda 100%
-- funcional y blindado para escalar.
-- ============================================================
-- `certificados` NUNCA fue una tabla exclusiva de certificados: guardaba
-- ambos tipos de documento en la misma fila (columna `tipo` con CHECK IN
-- ('certificado','informe')), igual que `plantillas_documentos`. Por eso
-- esto es un RENAME + purga + endurecimiento de constraints, no un DROP —
-- un DROP habría borrado también los informes, que deben seguir existiendo.

-- ─── 1. Purgar filas de tipo 'certificado' antes de endurecer el CHECK ───
-- (si quedara alguna, el ADD CONSTRAINT de abajo fallaría).
DELETE FROM certificados WHERE tipo = 'certificado';
DELETE FROM plantillas_documentos WHERE tipo = 'certificado';

-- ─── 2. Renombrar tabla, índices y trigger de auditoría ───
ALTER TABLE certificados RENAME TO informes;
ALTER INDEX IF EXISTS idx_certificados_codigo RENAME TO idx_informes_codigo;
ALTER INDEX IF EXISTS idx_certificados_user RENAME TO idx_informes_user;
ALTER INDEX IF EXISTS idx_certificados_empresa RENAME TO idx_informes_empresa;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_certificados'
  ) THEN
    ALTER TRIGGER trg_audit_certificados ON informes RENAME TO trg_audit_informes;
  END IF;
END $$;

-- ─── 3. Bloquear 'certificado' a nivel de base de datos: de aquí en
--        adelante estas tablas solo pueden contener informes. ───
ALTER TABLE informes DROP CONSTRAINT IF EXISTS certificados_tipo_check;
ALTER TABLE informes ADD CONSTRAINT informes_tipo_check CHECK (tipo = 'informe');
ALTER TABLE informes ALTER COLUMN tipo SET DEFAULT 'informe';

ALTER TABLE plantillas_documentos DROP CONSTRAINT IF EXISTS plantillas_documentos_tipo_check;
ALTER TABLE plantillas_documentos ADD CONSTRAINT plantillas_documentos_tipo_check CHECK (tipo = 'informe');
ALTER TABLE plantillas_documentos ALTER COLUMN tipo SET DEFAULT 'informe';

-- ─── 4. Renombrar políticas RLS (misma lógica, solo cambia el nombre) ───
DROP POLICY IF EXISTS "certificados_own_select" ON informes;
CREATE POLICY "informes_own_select" ON informes FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "certificados_empresa_select" ON informes;
CREATE POLICY "informes_empresa_select" ON informes FOR SELECT USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

DROP POLICY IF EXISTS "certificados_super_admin_select" ON informes;
CREATE POLICY "informes_super_admin_select" ON informes FOR SELECT USING (get_my_rol() = 'super_admin');

DROP POLICY IF EXISTS "certificados_insert" ON informes;
CREATE POLICY "informes_insert" ON informes FOR INSERT WITH CHECK (user_id = auth.uid());
