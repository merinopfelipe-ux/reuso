-- ============================================================
-- Calculadora de Reúso — Schema inicial V1.0
-- Ejecutar completo en Supabase SQL Editor
-- ============================================================

-- ─── 1. TABLAS BASE (sin dependencias) ───────────────────────

CREATE TABLE empresas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  slug        text UNIQUE NOT NULL,
  logo_url    text,
  plan        text NOT NULL DEFAULT 'free'
                CHECK (plan IN ('free', 'lab', 'impulso', 'ilimitado')),
  activa      boolean NOT NULL DEFAULT true,
  sector      text,
  notas_admin text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categorias (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text NOT NULL,
  icono_lucide text NOT NULL DEFAULT 'Tag',
  descripcion  text,
  activa       boolean NOT NULL DEFAULT true,
  orden        integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. PROFILES (depende de empresas) ───────────────────────

CREATE TABLE profiles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre         text NOT NULL DEFAULT '',
  apellido       text NOT NULL DEFAULT '',
  apodo          text,
  email          text NOT NULL DEFAULT '',
  rol            text NOT NULL DEFAULT 'usuario_libre'
                   CHECK (rol IN ('super_admin', 'empresa_admin', 'empleado', 'usuario_libre')),
  empresa_id     uuid REFERENCES empresas(id) ON DELETE SET NULL,
  avatar_url          text,
  tema_preferido      text NOT NULL DEFAULT 'system'
                        CHECK (tema_preferido IN ('light', 'dark', 'system')),
  acepta_terminos_at  timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── 3. ITEMS (depende de categorias) ────────────────────────

CREATE TABLE items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id    uuid NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  descripcion     text,
  peso_kg         numeric(10, 3) NOT NULL,
  co2_por_unidad  numeric(10, 4) NOT NULL,
  icono_lucide    text,
  activo          boolean NOT NULL DEFAULT true,
  orden           integer NOT NULL DEFAULT 0,
  origen_fuente   text,
  detalle_fuente  text,
  nivel_confianza text NOT NULL DEFAULT 'alta'
                    CHECK (nivel_confianza IN ('alta', 'media', 'baja')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 4. TABLAS TRANSACCIONALES ────────────────────────────────

-- calculos: INMUTABLE — nunca se edita ni borra
CREATE TABLE calculos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id           uuid REFERENCES empresas(id) ON DELETE SET NULL,
  fecha                timestamptz NOT NULL DEFAULT now(),
  total_co2            numeric(14, 4) NOT NULL,
  total_agua           numeric(14, 4) NOT NULL DEFAULT 0,
  detalle_json         jsonb NOT NULL DEFAULT '{}',
  factor_snapshot_json jsonb NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- certificados: INMUTABLE
CREATE TABLE certificados (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                text NOT NULL CHECK (tipo IN ('certificado', 'informe')),
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  empresa_id          uuid REFERENCES empresas(id) ON DELETE SET NULL,
  fecha_inicio        date,
  fecha_fin           date,
  co2_total           numeric(14, 4) NOT NULL,
  agua_total          numeric(14, 4) NOT NULL DEFAULT 0,
  codigo_verificacion uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  pdf_url             text,
  metadata_json       jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_certificados_codigo ON certificados(codigo_verificacion);

CREATE TABLE invitaciones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  email        text NOT NULL,
  token_hash   text NOT NULL,
  estado       text NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente', 'aceptada', 'expirada')),
  rol_asignado text NOT NULL DEFAULT 'empleado'
                 CHECK (rol_asignado IN ('empresa_admin', 'empleado', 'usuario_libre')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_invitaciones_token_hash ON invitaciones(token_hash);

CREATE TABLE alertas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo            text NOT NULL,
  mensaje           text NOT NULL,
  tipo              text NOT NULL DEFAULT 'info'
                      CHECK (tipo IN ('info', 'promo', 'estado', 'urgente')),
  destinatario_tipo text NOT NULL DEFAULT 'todos'
                      CHECK (destinatario_tipo IN ('todos', 'empresa', 'usuario')),
  destinatario_id   uuid,
  activa            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz
);

CREATE TABLE alertas_leidas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id  uuid NOT NULL REFERENCES alertas(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alerta_id, user_id)
);

-- logs_auditoria: INMUTABLE — solo service_role puede insertar
CREATE TABLE logs_auditoria (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accion       text NOT NULL,
  detalle_json jsonb NOT NULL DEFAULT '{}',
  ip           text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── 5. TRIGGER: crear profile al registrarse ─────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nombre, acepta_terminos_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(COALESCE(NEW.email, ''), '@', 1)),
    CASE
      WHEN NEW.raw_user_meta_data->>'acepta_terminos_at' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'acepta_terminos_at')::timestamptz
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 6. FUNCIONES HELPER PARA RLS ────────────────────────────

CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rol FROM public.profiles WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_empresa_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT empresa_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- ─── 7. HABILITAR RLS ────────────────────────────────────────

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias     ENABLE ROW LEVEL SECURITY;
ALTER TABLE items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificados   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitaciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_leidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;

-- ─── 8. POLÍTICAS RLS ────────────────────────────────────────

-- profiles
CREATE POLICY "profiles_own"
  ON profiles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_super_admin_select"
  ON profiles FOR SELECT
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "profiles_super_admin_update"
  ON profiles FOR UPDATE
  USING (get_my_rol() = 'super_admin');

-- empresas
CREATE POLICY "empresas_empresa_admin"
  ON empresas FOR ALL
  USING (id = get_my_empresa_id())
  WITH CHECK (id = get_my_empresa_id());

CREATE POLICY "empresas_super_admin"
  ON empresas FOR ALL
  USING (get_my_rol() = 'super_admin');

-- categorias: todos los autenticados leen; super_admin escribe
CREATE POLICY "categorias_read"
  ON categorias FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "categorias_super_admin"
  ON categorias FOR ALL
  USING (get_my_rol() = 'super_admin');

-- items
CREATE POLICY "items_read"
  ON items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "items_super_admin"
  ON items FOR ALL
  USING (get_my_rol() = 'super_admin');

-- calculos: SELECT + INSERT solamente (sin UPDATE/DELETE)
CREATE POLICY "calculos_own_select"
  ON calculos FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "calculos_empresa_select"
  ON calculos FOR SELECT
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

CREATE POLICY "calculos_super_admin_select"
  ON calculos FOR SELECT
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "calculos_insert"
  ON calculos FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- certificados: mismo patrón que calculos
CREATE POLICY "certificados_own_select"
  ON certificados FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "certificados_empresa_select"
  ON certificados FOR SELECT
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

CREATE POLICY "certificados_super_admin_select"
  ON certificados FOR SELECT
  USING (get_my_rol() = 'super_admin');

CREATE POLICY "certificados_insert"
  ON certificados FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- invitaciones
CREATE POLICY "invitaciones_empresa_admin"
  ON invitaciones FOR ALL
  USING (empresa_id = get_my_empresa_id() AND get_my_rol() = 'empresa_admin');

CREATE POLICY "invitaciones_super_admin"
  ON invitaciones FOR ALL
  USING (get_my_rol() = 'super_admin');

-- alertas
CREATE POLICY "alertas_read_active"
  ON alertas FOR SELECT
  USING (
    activa = true AND (
      destinatario_tipo = 'todos'
      OR (destinatario_tipo = 'empresa' AND destinatario_id = get_my_empresa_id())
      OR (destinatario_tipo = 'usuario' AND destinatario_id = auth.uid())
    )
  );

CREATE POLICY "alertas_super_admin"
  ON alertas FOR ALL
  USING (get_my_rol() = 'super_admin');

-- alertas_leidas
CREATE POLICY "alertas_leidas_own"
  ON alertas_leidas FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- logs_auditoria: solo super_admin puede leer; INSERT vía service_role únicamente
CREATE POLICY "logs_super_admin_read"
  ON logs_auditoria FOR SELECT
  USING (get_my_rol() = 'super_admin');

-- ─── 9. DATOS SEMILLA ────────────────────────────────────────

-- Categoría 1: Ropa y Textiles
WITH cat AS (
  INSERT INTO categorias (nombre, icono_lucide, descripcion, activa, orden)
  VALUES ('Ropa y Textiles', 'Shirt', 'Prendas de vestir y tejidos reutilizados', true, 1)
  RETURNING id
)
INSERT INTO items
  (categoria_id, nombre, peso_kg, co2_por_unidad, origen_fuente, detalle_fuente, nivel_confianza, activo, orden)
SELECT
  cat.id, v.nombre, v.peso_kg, v.co2_por_unidad, v.origen_fuente, v.detalle_fuente, 'alta', true, v.orden
FROM cat,
(VALUES
  ('Camiseta',          0.200, 1.2200, 'ecoinvent 3.8 / PEF method', 'Producción textil algodón convencional (cradle-to-gate)', 1),
  ('Pantalón',          0.800, 4.8800, 'ecoinvent 3.8 / PEF method', 'Tejido denim, incluye confección y acabado', 2),
  ('Chaqueta',          1.200, 7.3200, 'ecoinvent 3.8 / PEF method', 'Prenda exterior mixta, incluye cremalleras y botones', 3),
  ('Zapatos par',       0.700, 4.2700, 'ecoinvent 3.8 / PEF method', 'Calzado cuero sintético, par completo', 4),
  ('Otra ropa por kg',  1.000, 6.1000, 'ecoinvent 3.8 / PEF method', 'Factor promedio tejidos mixtos por kg', 5)
) AS v(nombre, peso_kg, co2_por_unidad, origen_fuente, detalle_fuente, orden);

-- Categoría 2: Muebles
WITH cat AS (
  INSERT INTO categorias (nombre, icono_lucide, descripcion, activa, orden)
  VALUES ('Muebles', 'Armchair', 'Mobiliario y elementos de madera reutilizados', true, 2)
  RETURNING id
)
INSERT INTO items
  (categoria_id, nombre, peso_kg, co2_por_unidad, origen_fuente, detalle_fuente, nivel_confianza, activo, orden)
SELECT
  cat.id, v.nombre, v.peso_kg, v.co2_por_unidad, v.origen_fuente, v.detalle_fuente, 'alta', true, v.orden
FROM cat,
(VALUES
  ('Silla',     8.0,  65.0,  'ecoinvent 3.8 / PEF method', 'Silla madera/metal, incluye tapizado promedio', 1),
  ('Mesa',      20.0, 90.0,  'ecoinvent 3.8 / PEF method', 'Mesa de madera maciza o aglomerado 4-6 personas', 2),
  ('Sofá',      40.0, 100.0, 'ecoinvent 3.8 / PEF method', 'Sofá de 3 plazas, estructura + tapizado', 3),
  ('Estante',   15.0, 55.0,  'ecoinvent 3.8 / PEF method', 'Estantería modular madera/aglomerado', 4)
) AS v(nombre, peso_kg, co2_por_unidad, origen_fuente, detalle_fuente, orden);

-- ─── MIGRACIÓN: apellido y apodo en profiles ─────────────────
-- Ejecutar SOLO si la tabla profiles ya existía sin estas columnas:
--
--   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS apellido text NOT NULL DEFAULT '';
--   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS apodo text;
--
-- ─── FIN DEL SCHEMA ───────────────────────────────────────────
-- SIGUIENTE PASO: Crear tu primer super_admin
--
-- 1. Ve a Supabase → Authentication → Users → Add user
--    Marca "Auto Confirm User". Usa tu email y contraseña.
-- 2. Copia el UUID del usuario creado.
-- 3. Ejecuta:
--
--    UPDATE profiles SET rol = 'super_admin' WHERE user_id = '<PEGA-UUID-AQUÍ>';
--
-- 4. Verifica:
--    SELECT user_id, email, rol FROM profiles;
