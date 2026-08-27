-- 105: Reemplazo de 'certificado_origen' por 'declaracion_origen' en dpp_documentos_ingesta

-- 1. Eliminar la restricción de check anterior si existe
ALTER TABLE public.dpp_documentos_ingesta 
  DROP CONSTRAINT IF EXISTS dpp_documentos_ingesta_tipo_check;

-- 2. Migrar los datos existentes
UPDATE public.dpp_documentos_ingesta 
  SET tipo = 'declaracion_origen' 
  WHERE tipo = 'certificado_origen';

-- 3. Crear la nueva restricción con 'declaracion_origen'
ALTER TABLE public.dpp_documentos_ingesta 
  ADD CONSTRAINT dpp_documentos_ingesta_tipo_check 
  CHECK (tipo IN ('factura_compra', 'recibo_energia', 'declaracion_origen', 'foto_objeto', 'otro'));
