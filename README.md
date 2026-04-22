# Calculadora de Reúso — reuso.lurdes.co

SaaS que mide, certifica y comunica el CO₂ evitado cuando personas y organizaciones reutilizan objetos. Genera certificados PDF e informes con QR verificable.

**Producto:** Grupo MLP S.A.S. · servicio@lurdes.co

## Stack Tecnológico

- **Framework:** Next.js 14 App Router
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Base de Datos / Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Despliegue:** Vercel

## Primeros Pasos (Setup Inicial)

Si eres un nuevo desarrollador integrándote al proyecto, sigue estos pasos:

1. **Instalar Dependencias**
   ```bash
   npm install
   ```

2. **Variables de Entorno**
   Copia el archivo de ejemplo para generar tu archivo local:
   ```bash
   cp .env.example .env.local
   ```
   Rellena `.env.local` con tus claves reales. (Nunca subas tus claves a GitHub, este archivo está explícitamente excluido en el `.gitignore`).

3. **Base de Datos Inicial (Seed)**
   Debes cargar la información base a Supabase (ej: Categorías e Items predeterminados). Esto se hace con un comando automatizado.
   ```bash
   npm run seed
   ```

4. **Correr el Proyecto**
   ```bash
   npm run dev
   ```

## Comandos Disponibles

- `npm run dev` — Inicia servidor de desarrollo en `localhost:3000`.
- `npm run dev:clean` — Inicia dev limpiando caché `.next` (útil si eliminaste archivos masivos).
- `npm run build` — Compila y empaqueta el sistema para producción. (Si falla, el sistema en vivo también fallará).
- `npm run lint` — Checa errores de sintaxis y buenas prácticas.
- `npm run seed` — Inserta los Datos Iniciales fundamentales en Supabase a través de `service_role`.

## Roles

| Rol | Panel | Descripción |
|-----|-------|-------------|
| `super_admin` | `/admin` | Gestiona todo el sistema |
| `empresa_admin` | `/empresa` | Su empresa, equipo, certificados |
| `empleado` | `/dashboard` | Calcula, ve impacto de empresa |
| `usuario_libre` | `/dashboard` | Plan Explora, sin empresa |

## Migraciones SQL (Base de Datos a Mano)

Si prefieres trabajar con SQL directamente:
Ejecutar en Supabase Studio en orden desde `sql/001_` hasta `sql/013_`.

## Checklist para Producción Final

1. Ejecutar todas las migraciones SQL en Supabase en orden.
2. Crear los buckets Storage en Supabase: `documentos`, `logos`, `firmas`.
3. Validar las políticas RLS.
4. Reemplazar `WA_NUMBER` en `src/lib/constants/contacto.ts`.
5. Configurar las variables exactas del `env.example` en Vercel.
6. Crear tu primer `super_admin` (registrándolo en la web y cambiándole el Rol manualmente en la BD desde Supabase usando una query UPDATE).
