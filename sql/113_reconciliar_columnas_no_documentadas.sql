-- ============================================================
-- 113 — Reconciliar columnas creadas a mano en producción, sin migración
-- ============================================================
-- Generado el 2026-09-01 tras dos hallazgos reales en producción que no
-- tenían ningún archivo sql/ que los documentara (verificado con grep en
-- todo sql/ antes de escribir este archivo, no de memoria):
--
--   · profiles.legal_aceptado_en (timestamptz) — la función handle_new_user()
--     de sql/022 y sql/028 ya inserta en esta columna, pero ningún sql/ la
--     crea. Efecto real: reuso-staging (provisionado solo desde sql/) no la
--     tiene, así que CUALQUIER registro nuevo falla ahí con "Database error
--     creating new user" (la transacción del trigger revienta). En producción
--     ya existe (alguien la agregó a mano), por eso nunca se notó ahí.
--
--   · crm_muebles_cotizados.precio_mercado_nuevo / _fuente_url / _estado —
--     usadas por src/lib/ia/precio-mercado.ts y
--     src/app/api/cotizador/muebles/[muebleId]/precio-mercado/route.ts
--     (función "precio de mercado nuevo con IA", Reporte de Rentabilidad).
--     Ya existen en producción y funcionan, pero tampoco tenían archivo sql/.
--
-- Es seguro repetirlo: todo va con IF NOT EXISTS, no borra ni modifica
-- ningún dato existente.
-- ============================================================

-- ─── profiles.legal_aceptado_en (usada por handle_new_user desde sql/022) ───
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS legal_aceptado_en timestamptz;

-- ─── crm_muebles_cotizados: precio de mercado nuevo, sugerido por IA ───
ALTER TABLE public.crm_muebles_cotizados
  ADD COLUMN IF NOT EXISTS precio_mercado_nuevo numeric(14,2),
  ADD COLUMN IF NOT EXISTS precio_mercado_fuente_url text,
  ADD COLUMN IF NOT EXISTS precio_mercado_estado text NOT NULL DEFAULT 'pendiente'
    CHECK (precio_mercado_estado IN ('pendiente', 'sugerido', 'confirmado', 'sin_resultado'));
