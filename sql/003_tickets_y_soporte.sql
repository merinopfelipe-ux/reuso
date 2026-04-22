-- ============================================================
-- Calculadora de Reúso — Schema Bloque 5 (Tickets y Soporte)
-- ============================================================

-- 1. Crear tabla de tickets
CREATE TABLE IF NOT EXISTS tickets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        text NOT NULL,
  tipo          text CHECK (tipo IN ('bug','duda','solicitud','queja')),
  prioridad     text DEFAULT 'media' CHECK (prioridad IN ('baja','media','alta','urgente')),
  estado        text DEFAULT 'abierto' CHECK (estado IN ('abierto','en_proceso','resuelto','cerrado')),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id    uuid REFERENCES empresas(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 2. Crear tabla de mensajes de tickets (hilos)
CREATE TABLE IF NOT EXISTS tickets_mensajes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    uuid REFERENCES tickets(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mensaje_html text NOT NULL,
  es_admin     boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- 3. Habilitar RLS en las nuevas tablas
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_mensajes ENABLE ROW LEVEL SECURITY;

-- 4. Definir Políticas para Tickets
-- Super Admin: Todo
DROP POLICY IF EXISTS "tickets_super_admin" ON tickets;
CREATE POLICY "tickets_super_admin"
  ON tickets FOR ALL
  USING (get_my_rol() = 'super_admin');

-- Propietario (empleado, libre, empresa_admin personal) puede Leer sus propios tickets
DROP POLICY IF EXISTS "tickets_own_select" ON tickets;
CREATE POLICY "tickets_own_select"
  ON tickets FOR SELECT
  USING (user_id = auth.uid());

-- Empresa Admin puede ver los tickets de su propia empresa
DROP POLICY IF EXISTS "tickets_empresa_admin_select" ON tickets;
CREATE POLICY "tickets_empresa_admin_select"
  ON tickets FOR SELECT
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

-- Inserción condicionada a uno mismo
DROP POLICY IF EXISTS "tickets_insert" ON tickets;
CREATE POLICY "tickets_insert"
  ON tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 5. Definir Políticas para Tickets Mensajes
-- Super Admin: Todo
DROP POLICY IF EXISTS "tickets_mensajes_super_admin" ON tickets_mensajes;
CREATE POLICY "tickets_mensajes_super_admin"
  ON tickets_mensajes FOR ALL
  USING (get_my_rol() = 'super_admin');

-- Usuarios pueden ver mensajes de tickets a los que tienen acceso
DROP POLICY IF EXISTS "tickets_mensajes_read" ON tickets_mensajes;
CREATE POLICY "tickets_mensajes_read"
  ON tickets_mensajes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t 
      WHERE t.id = tickets_mensajes.ticket_id
      AND (
        t.user_id = auth.uid() OR
        (t.empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin')
      )
    )
  );

-- Inserción de mensajes por su dueño
DROP POLICY IF EXISTS "tickets_mensajes_insert" ON tickets_mensajes;
CREATE POLICY "tickets_mensajes_insert"
  ON tickets_mensajes FOR INSERT
  WITH CHECK (user_id = auth.uid());
