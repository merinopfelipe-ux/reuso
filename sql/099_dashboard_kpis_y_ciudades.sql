-- 099_dashboard_kpis_y_ciudades.sql
-- Añade la configuración personalizada de los KPIs visibles y su orden
-- y la configuración de agrupación de ciudades por Área Metropolitana
-- a la tabla de configuración de empresas.

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS kpis_config JSONB DEFAULT '["tasa_cierre", "ticket_promedio", "tiempo_apertura", "muebles_cotizados"]'::jsonb,
  ADD COLUMN IF NOT EXISTS ciudades_agrupadas_config JSONB DEFAULT '{"medellín": [], "bogotá": []}'::jsonb;
