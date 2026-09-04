-- ============================================================
-- 121 — Semilla de FAQ real en contenido_landing
-- ============================================================
-- La pestaña FAQ de /admin/contenido ya existía y guarda en
-- contenido_landing (clave 'faq'), pero la landing pública todavía leía un
-- array hardcodeado en landing-client.tsx, nunca esta tabla. A pedido del
-- usuario 2026-09-04 ("toma el contenido que ya está y colócalo allí, si
-- cambio el contenido, cambia en la landing"): se siembra la fila 'faq'
-- con el contenido real que ya mostraba la landing, para que el editor de
-- /admin/contenido arranque con las 4 preguntas reales, no vacío.
-- ON CONFLICT DO NOTHING: si el super_admin ya guardó algo en 'faq' desde
-- el editor antes de correr esto, no se pisa.

INSERT INTO contenido_landing (clave, valor_json)
VALUES (
  'faq',
  '{"items": [
    {"pregunta": "¿Qué es la RSE y cómo se implementa en empresas o negocios locales?", "respuesta": "La RSE es la decisión voluntaria de gestionar tu impacto positivo en la comunidad y el planeta. En negocios locales la implementas pasando del discurso a los hechos: utilizas la Calculadora de Reúso para registrar tus materiales o productos reacondicionados, estimar los recursos que preservas y generar reportes técnicos que sustentan tu compromiso social y ambiental ante clientes y aliados."},
    {"pregunta": "¿Qué significa la responsabilidad social empresarial para una pyme en Colombia?", "respuesta": "Para una pyme en Colombia significa competir con transparencia y abrir puertas a nuevos contratos corporativos. Con la Calculadora de Reúso transformas tus esfuerzos de reciclaje y reuso en métricas claras de agua, CO₂ y residuos evitados, permitiéndote presentar informes confiables y participar en licitaciones que exigen criterios de sostenibilidad comprobables."},
    {"pregunta": "¿Qué es la economía circular y cómo impacta mi consumo diario?", "respuesta": "La economía circular consiste en mantener materiales y productos en uso el mayor tiempo posible, reduciendo la extracción de recursos vírgenes. Desde la Calculadora de Reúso medimos ese impacto cotidiano: cuando eliges un producto con Pasaporte Digital (DPP), la calculadora estima cuántos litros de agua y kilogramos de residuos ahorraste con esa decisión frente a comprar un artículo nuevo."},
    {"pregunta": "¿Dónde puedo comprar productos fabricados con principios de economía circular en Colombia?", "respuesta": "Puedes adquirirlos a través de la red de empresas, marcas y talleres aliados que gestionan sus inventarios y valorizan materiales con la Calculadora de Reúso. Cada artículo cuenta con su Pasaporte Digital (DPP) mediante código QR, donde puedes verificar el origen de los insumos y la estimación ambiental de su vida útil extendida."}
  ]}'::jsonb
)
ON CONFLICT (clave) DO NOTHING;
