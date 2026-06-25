-- Migración 030: columna para guardar el motivo de baja de marketing
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS unsubscribe_reason TEXT;
