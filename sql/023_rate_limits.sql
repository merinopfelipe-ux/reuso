-- =====================================================================
-- Migración 023 — Tablas de Rate Limiting Persistente
-- Calculadora de Reúso | 2026-06-08
-- Ejecutar completo en Supabase → SQL Editor
-- =====================================================================

-- 1. Tabla de Rate Limiting por IP (registro / login)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  accion text NOT NULL,
  creado_en timestamp with time zone DEFAULT now() NOT NULL
);

-- Crear índices de búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_accion_creado ON public.rate_limits (ip, accion, creado_en);

-- Habilitar RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 2. Tabla de Rate Limiting para Acciones Sensibles por Usuario / IP (e.g. cambiar contraseña, OTP)
CREATE TABLE IF NOT EXISTS public.rate_limits_sensibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, -- Opcional, para asociar al usuario autenticado
  ip text NOT NULL,
  accion text NOT NULL,
  exitoso boolean DEFAULT false NOT NULL,
  creado_en timestamp with time zone DEFAULT now() NOT NULL
);

-- Crear índices de búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_rate_limits_sensibles_user_accion ON public.rate_limits_sensibles (user_id, accion, creado_en);
CREATE INDEX IF NOT EXISTS idx_rate_limits_sensibles_ip_accion ON public.rate_limits_sensibles (ip, accion, creado_en);

-- Habilitar RLS
ALTER TABLE public.rate_limits_sensibles ENABLE ROW LEVEL SECURITY;
