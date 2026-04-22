-- ============================================================
-- Calculadora de Reúso — Schema: beneficiario en certificados
-- ============================================================
-- La columna `beneficiario` almacena el nombre de quien recibe
-- el certificado (empresa o persona) para mostrarlo en el admin
-- sin necesidad de joins adicionales. Es solo display.
ALTER TABLE certificados ADD COLUMN IF NOT EXISTS beneficiario text;
