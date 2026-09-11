-- =====================================================================
-- Migración 127 — Beneficios (bullets) de cada plan, editables
-- Calculadora de Reúso | 2026-09-10
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================
-- Los beneficios que se listan en cada tarjeta de plan de la landing
-- pasan a ser editables desde /admin/contenido → pestaña Precios
-- (agregar / editar / eliminar), con el mismo flujo borrador→publicar
-- que los precios y límites. Antes eran un array fijo en el código
-- (src/lib/constants/pricing.ts), que queda solo como respaldo.
-- Formato: array de strings. NULL / [] = usar el respaldo del código.
-- =====================================================================

ALTER TABLE config_planes
  ADD COLUMN IF NOT EXISTS features_json jsonb,
  ADD COLUMN IF NOT EXISTS borrador_features_json jsonb;

UPDATE config_planes SET features_json = '[
  "Calculadora de huella de CO2 y agua",
  "Historial de todos tus cálculos",
  "Puesta en marcha guiada, gratis",
  "Soporte por email"
]'::jsonb WHERE id = 'free' AND features_json IS NULL;

UPDATE config_planes SET features_json = '[
  "Todo lo de Explora",
  "Informes de impacto con código QR de verificación pública",
  "Tu logo de empresa en los informes",
  "Catálogo de materiales con factores de referencia",
  "Puesta en marcha guiada, gratis",
  "Soporte por email"
]'::jsonb WHERE id = 'lab' AND features_json IS NULL;

UPDATE config_planes SET features_json = '[
  "Todo lo de Circular Lab",
  "Asistente de IA: sube una foto o un documento y el sistema lo interpreta",
  "Pasaporte Digital de Producto con página pública y QR",
  "Cotizador con CRM de clientes y embudo de ventas",
  "Crea tus propias categorías y materiales",
  "Puesta en marcha guiada, gratis",
  "Soporte por email"
]'::jsonb WHERE id = 'impulso' AND features_json IS NULL;

UPDATE config_planes SET features_json = '[
  "Todo lo de Impulso Sostenible, sin límites de uso",
  "Circularidad de Materiales",
  "Exportación a Excel y CSV",
  "Integración con tus sistemas",
  "Soporte prioritario"
]'::jsonb WHERE id = 'ilimitado' AND features_json IS NULL;
