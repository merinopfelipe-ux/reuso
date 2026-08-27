-- Corrige un bug real: crm_cotizaciones.asesor_id apuntaba por error a
-- profiles(id) (la PK propia de profiles, gen_random_uuid()), pero el código
-- de la aplicación siempre le asigna auth.users.id (el id de sesión, el mismo
-- que usan alertas.destinatario_id vía auth.uid() y logs_auditoria.user_id).
-- Como profiles.id y auth.users.id son UUIDs independientes, todo INSERT
-- fallaba con "violates foreign key constraint crm_cotizaciones_asesor_id_fkey"
-- (Postgres 23503) — esto es lo que causaba "Error al crear la cotización."

ALTER TABLE crm_cotizaciones
  DROP CONSTRAINT IF EXISTS crm_cotizaciones_asesor_id_fkey;

ALTER TABLE crm_cotizaciones
  ADD CONSTRAINT crm_cotizaciones_asesor_id_fkey
  FOREIGN KEY (asesor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
