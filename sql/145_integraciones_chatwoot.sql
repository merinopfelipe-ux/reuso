-- 145: Integraciones de mensajería (Chatwoot) por empresa + registro de eventos procesados.
-- Expandir-contraer: solo CREATE TABLE IF NOT EXISTS y CREATE POLICY con DROP previo.
-- Corre en staging (rjcfqcqgqxoblisuyapq) primero, producción después.

CREATE TABLE IF NOT EXISTS integraciones_empresa (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id               uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  proveedor                text        NOT NULL DEFAULT 'chatwoot',
  account_id               text        NOT NULL,
  api_url                  text        NOT NULL,
  api_token_cifrado        text        NOT NULL,
  webhook_secret_cifrado   text        NOT NULL,
  activa                   boolean     NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proveedor, account_id)
);

ALTER TABLE integraciones_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_integraciones_empresa" ON integraciones_empresa;
CREATE POLICY "super_admin_integraciones_empresa"
  ON integraciones_empresa FOR ALL TO authenticated
  USING  (get_my_rol() = 'super_admin')
  WITH CHECK (get_my_rol() = 'super_admin');

-- Sin políticas: solo el service role la lee y escribe (webhooks y tarea de limpieza).
CREATE TABLE IF NOT EXISTS integraciones_eventos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clave       text        NOT NULL UNIQUE,
  estado      text        NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'decidido')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integraciones_eventos_created_at ON integraciones_eventos (created_at);

ALTER TABLE integraciones_eventos ENABLE ROW LEVEL SECURITY;
