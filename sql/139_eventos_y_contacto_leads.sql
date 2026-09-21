-- =====================================================================
-- Migración 139 — Eventos programables y contacto de leads (/eventos)
-- Calculadora de Reúso | 2026-09-21
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================

-- 1. Eventos que el super_admin programa desde /admin/leads. La página
--    pública /eventos y el correo automático usan el de hoy o el próximo.
CREATE TABLE IF NOT EXISTS eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  fecha date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins gestionan eventos" ON eventos;
CREATE POLICY "Superadmins gestionan eventos"
  ON eventos FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND rol = 'super_admin'));

-- 2. Leads: en un evento basta el celular o el correo, así que el correo
--    deja de ser obligatorio. Se relaja una restricción, no se borra nada.
ALTER TABLE leads ALTER COLUMN email DROP NOT NULL;

-- 3. Celular con indicativo (ej. "+57 3001234567") y nombre del evento en
--    el que se captó. Nullable, sin relleno de datos anteriores.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS telefono text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS evento_nombre text;
