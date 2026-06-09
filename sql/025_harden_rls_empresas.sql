-- =====================================================================
-- Migración 025 — Robustecimiento de RLS en Empresas y Cotizaciones
-- Calculadora de Reúso | 2026-06-09
-- Ejecutar completo en Supabase → SQL Editor
-- =====================================================================

-- 1. Reparar RLS en la tabla empresas
DROP POLICY IF EXISTS "empresas_empresa_admin" ON public.empresas;
DROP POLICY IF EXISTS "empresas_select_miembros" ON public.empresas;
DROP POLICY IF EXISTS "empresas_update_admin" ON public.empresas;

-- Permitir SELECT a todos los miembros de la empresa (empresa_admin y empleados)
CREATE POLICY "empresas_select_miembros"
  ON public.empresas FOR SELECT
  USING (id = get_my_empresa_id());

-- Permitir UPDATE únicamente al administrador de la empresa (empresa_admin)
CREATE POLICY "empresas_update_admin"
  ON public.empresas FOR UPDATE
  USING (id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin')
  WITH CHECK (id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

-- 2. Eliminar políticas de lectura pública que exponen datos de cotizaciones
DROP POLICY IF EXISTS "crm_cotizaciones_publico_token" ON public.crm_cotizaciones;
DROP POLICY IF EXISTS "crm_muebles_publico_cotizacion" ON public.crm_muebles_cotizados;
