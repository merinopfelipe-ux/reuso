-- Onboarding real de primer inicio de sesión (checklist de 19 fundamentales,
-- 2026-09-05). Antes, la tarjeta de bienvenida se mostraba/ocultaba solo
-- mirando si la persona tenía 0 cálculos guardados — reaparecía cada vez que
-- volvía a quedar en 0 (ej. si borraba todos sus cálculos), y no distinguía
-- "la vi y la omití" de "todavía no la he visto". Esta columna guarda el
-- hecho real, independiente de cuántos cálculos tenga la persona.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_visto boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.onboarding_visto IS 'true cuando la persona terminó o dijo Omitir en la tarjeta de bienvenida del dashboard. No se resetea automáticamente por ningún evento.';
