# Cotizador Inteligente + CRM — Resumen Técnico
**Versión:** V6 (2026-06-05) · reuso.lurdes.co · Grupo MLP S.A.S

---

## Resumen ejecutivo

Módulo comercial que permite a los asesores de Lurdes fotografiar un mueble, recibir un diagnóstico de viabilidad por IA, ajustar los oficios con toggles, generar una propuesta pública personalizada y hacer seguimiento del embudo de ventas.

**Regla de oro:** la IA SOLO clasifica (booleanos). NUNCA calcula precios. El motor determinista hace toda la matemática.

---

## Tablas de base de datos (migración 018)

| Tabla | Propósito |
|---|---|
| `crm_cotizaciones` | Cabecera de cada cotización: estado, totales, CO2, token público |
| `crm_clientes` | Datos del cliente (nombre, tel, email) |
| `crm_muebles_cotizados` | Ítems por cotización: oficios, precios, imagen, CO2 |
| `crm_config_costos` | Precios base por tipo de mueble (configurable por empresa) |
| `cotizador_precios` | Histórico de precios calculados |
| `cotizador_pipeline` | Registro de cambios de estado del embudo |
| `ia_memoria_visual` | Casos de corrección humana para few-shot learning |

**Estados de `crm_cotizaciones`:** `por_cotizar → cotizada → enviada → en_negociacion → ganada / perdida / sin_respuesta`

### Migración 020 — Personalización de marca
Columnas añadidas a `empresas`:

```sql
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS logo_propuesta_url       TEXT,
  ADD COLUMN IF NOT EXISTS nombre_footer_propuesta  TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_propuesta        TEXT,
  ADD COLUMN IF NOT EXISTS mostrar_marca_reuso       BOOLEAN DEFAULT TRUE;
```

---

## APIs REST

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/cotizador/config` | empresa_admin, empleado | Precios activos por tipo de mueble |
| POST | `/api/cotizador/cotizaciones` | empresa_admin, empleado | Crear cotización vacía |
| GET | `/api/cotizador/cotizaciones` | empresa_admin, empleado | Listar cotizaciones del embudo |
| GET | `/api/cotizador/cotizaciones/[id]` | empresa_admin, empleado | Detalle de cotización |
| PATCH | `/api/cotizador/cotizaciones/[id]` | empresa_admin, empleado | Actualizar estado/descuento |
| POST | `/api/cotizador/cotizaciones/[id]/mueble` | empresa_admin, empleado | Agregar mueble (calcula precio) |
| GET | `/api/cotizador/cotizaciones/[id]/muebles` | empresa_admin, empleado | Listar muebles de cotización |
| POST | `/api/cotizador/diagnostico` | empresa_admin, empleado | Diagnóstico IA (Gemini→Qwen→Groq) |
| GET | `/api/cotizador/marca` | empresa_admin | Config de marca de propuesta |
| PATCH | `/api/cotizador/marca` | empresa_admin | Actualizar logo/footer/WhatsApp |
| GET | `/api/empresa/modulos` | empresa_admin | Módulos activos + asignaciones |
| PATCH | `/api/empresa/modulos/usuarios` | empresa_admin | Toggle acceso de usuario a módulo |
| GET | `/api/cron/cotizaciones-frias` | CRON_SECRET | Alertas por cotizaciones +48h sin respuesta |

---

## Control de acceso

### Dos niveles
1. **`modulos_empresas`** — el super_admin activa/desactiva módulos por empresa
2. **`modulos_usuarios`** — el empresa_admin asigna acceso a cada empleado

### Función central
```ts
// src/lib/permisos/modulos.ts
puedeAccederModulo(userId, empresaId, rol, 'cotizador_crm'): Promise<boolean>
```
- `super_admin` → siempre true
- Busca módulo por `clave` en `modulos`
- Verifica `modulos_empresas.activo`
- Si no hay registro en `modulos_usuarios` → hereda acceso de empresa

### Middleware
`src/middleware.ts` intercepta `/empresa/cotizador/*` y llama a la verificación. Redirige a `?modulo_bloqueado=cotizador` si no hay acceso.

---

## Personalización de marca (E1)

El empresa_admin configura en `/empresa/configuracion/marca`:
- **Logo de propuesta** — comprimido a WebP (máx 600px, 90% calidad) antes de subir a bucket `logos/propuesta-logos/{empresa_id}/`
- **Nombre en footer** — reemplaza "Lurdes" en la propuesta pública
- **WhatsApp de empresa** — normalizado a solo dígitos, reemplaza el teléfono del cliente como destino del botón "Tengo dudas"
- **Toggle "Hecho con Reúso"** — crédito al pie, activo por defecto

Lógica en `propuesta-client.tsx`:
```ts
const logoFinal = empresas.logo_propuesta_url ?? empresas.logo_url ?? null
const empresaNombre = empresas.nombre_footer_propuesta ?? empresas.nombre ?? 'Lurdes'
const waDestino = empresas.whatsapp_propuesta ?? (clienteTel ? `57${clienteTel}` : null)
```

---

## Flujos principales

### 1. Nueva cotización
```
/empresa/cotizador/nueva
  → sube foto → POST /api/cotizador/diagnostico (IA clasifica)
  → ajusta toggles de oficios → calcularCotizacion() cliente (motor puro)
  → POST /api/cotizador/cotizaciones (crea cabecera)
  → POST /api/cotizador/cotizaciones/[id]/mueble (guarda mueble + recalcula totales)
  → repite por mueble adicional O navega al detalle
```

### 2. Propuesta pública
```
/empresa/cotizador/[id] → genera token → copia enlace
  → cliente abre /propuesta/[token] (sin auth, siempre modo claro)
  → se registra veces_abierta y fecha_apertura_cliente
  → botón "Tengo dudas" → WhatsApp del asesor/empresa
```

### 3. Embudo CRM
```
/empresa/cotizador (panel)
  → KPIs: valor embudo, tasa cierre, CO2, cotizaciones activas
  → tabs por estado → tarjetas con badge "fría" (>48h)
  → clic → /empresa/cotizador/[id] → timeline + cambio de estado + copys WhatsApp
```

### 4. Cron de cotizaciones frías
- Vercel Cron: `0 13 * * *` (8:00 AM Colombia)
- Endpoint: `GET /api/cron/cotizaciones-frias` protegido con `Authorization: Bearer CRON_SECRET`
- Busca cotizaciones `enviada/en_negociacion` con `fecha_enviada` hace más de 48h
- Inserta alerta en `alertas` para el asesor de cada cotización

---

## Páginas del módulo

| Ruta | Descripción |
|---|---|
| `/empresa/cotizador` | Panel CRM con embudo y KPIs |
| `/empresa/cotizador/nueva` | UI de captura: foto → IA → toggles → propuesta |
| `/empresa/cotizador/[id]` | Detalle: timeline, estado, copys WhatsApp, link |
| `/empresa/configuracion/modulos` | Gestión de acceso por usuario |
| `/empresa/configuracion/marca` | Logo, footer, WhatsApp de propuesta |
| `/propuesta/[token]` | Propuesta pública (sin auth, modo claro siempre) |

---

## Variables de entorno requeridas

```bash
# Diagnóstico IA
GEMINI_KEY=...
OR_KEY=...         # OpenRouter (Qwen fallback)
GROQ_KEY=...       # Groq fallback

# Cron
CRON_SECRET=...

# Links públicos
NEXT_PUBLIC_BASE_URL=https://reuso.lurdes.co
```

---

## Pendientes conocidos

| Item | Condición |
|---|---|
| Sidebar dinámico (mostrar/ocultar Cotizador según acceso) | Requiere clave 2680 para modificar `sidebar.tsx` |
| Migración 018 — ejecutar en Supabase SQL Editor | Antes de activar el módulo en producción |
| Migración 020 — ejecutar en Supabase SQL Editor | `sql/020_marca_propuesta.sql` |
| Variables de entorno en Vercel | `CRON_SECRET`, `NEXT_PUBLIC_BASE_URL`, `GEMINI_KEY`, `OR_KEY`, `GROQ_KEY` |

---

## Patrones reutilizados del proyecto

- `dppAuthCheck` → `src/lib/dpp/auth-check.ts`
- `logAuditoria` → `src/lib/audit.ts`
- `PARAM_EQUIV` (CO2/agua) → `src/lib/calculos/co2.ts`
- `getIp` → `src/lib/admin-guard.ts`
- Canvas WebP compress (patrón DPP nuevo/page.tsx)
- Generación de código único con reintentos (patrón DPP activos/crear/route.ts)
