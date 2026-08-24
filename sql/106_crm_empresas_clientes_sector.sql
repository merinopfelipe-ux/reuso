-- Actividad económica (CIIU) para la empresa cliente del Cotizador — mismo
-- catálogo (src/lib/data/ciiu.json) que ya usa el registro/perfil de la
-- empresa usuaria de la plataforma (columna empresas.sector). Aquí es sobre
-- la EMPRESA A LA QUE SE LE COTIZA, no sobre la empresa dueña de la cuenta.

ALTER TABLE crm_empresas_clientes
  ADD COLUMN IF NOT EXISTS sector text;
