# CLAUDE.MD — Calculadora de Reúso
V14.8 (2026-06-05) · reuso.lurdes.co · Grupo MLP S.A.S
VOZ ACTIVA. MOBILE-FIRST. USUARIO PRIMERO. CONFIANZA EN DATOS.

## 5 DIRECTRICES IRRENUNCIABLES

0) FONDO INTERIOR BLANCO PURO: Dentro de la app autenticada el fondo de página es SIEMPRE #FFFFFF.
   Prohibido usar #F5FAFA, #F2F9F8, #F8FBFA u otro tono como fondo de pantalla completa en rutas protegidas.
   Solo se permiten fondos de color en: tarjetas internas, secciones destacadas, páginas públicas (landing, legal, status).

1) MOBILE-FIRST: Diseña 375px primero. Carga menos de 2s en 4G. Lighthouse mayor a 80.
   Login a dashboard menos de 1s. Formulario a guardar menos de 2s. QR a pasaporte menos de 2s.

2) USUARIO PRIMERO: Cada pantalla resuelve UN problema.
   Sylvia (admin): menos de 4 min de login a reporte CFO listo.
   Marco (empleado): menos de 90 seg para registrar un reúso.
   Roberto (CFO): menos de 3 seg abre PDF, ve números grandes.
   Patricia (consumidor): menos de 30 seg escanea QR y confía.

3) VOZ ACTIVA: Imperativo directo, cercano, celebra logros.
   SI "Evitaste 125 kg CO2" NO "Se evitaron 125 kg".
   SI "Registra nuevo ciclo" NO "Un ciclo puede registrarse".
   SI "Completa estos 3 campos" NO "Faltan campos por completar".

4) CONFIANZA DATOS: Fuentes visibles, hash SHA-256, usuario SIEMPRE confirma.
   OCR IA extrae, usuario valida (la IA nunca inventa).
   Cada factor CO2 muestra su origen (ecoinvent, ELCD, DEFRA).

5) EFICIENCIA: Rápido, ligero, inteligente.
   Prompts Claude Code: reutiliza código existente, no re-escribas.
   Performance: menos de 2s carga, ISR en públicas, lazy-load.
   Prohibido alucinar: no inventar colores, componentes ni factores.

## 🔐 SEGURIDAD — REGLAS MÍNIMAS INQUEBRANTABLES
- **NUNCA** renderizar HTML de usuario con `dangerouslySetInnerHTML` sin `DOMPurify.sanitize()` antes (en el API route, antes del INSERT).
- **NUNCA** confiar en `user_id`/`empresa_id` del body del cliente: extraer siempre de la sesión de servidor (`supabase.auth.getUser()`).
- **NUNCA** usar `getPublicUrl()` para archivos privados de usuarios: usar `createSignedUrl(ttl≤60s)`. Buckets privados: `documentos`, `dpp`, `firmas`.

## 🔒 REGLAS DE ORO — INQUEBRANTABLES
1. **PROHIBIDO MODIFICAR LO QUE EL USUARIO NO PIDA ESPECÍFICAMENTE.** Seguir estrictamente las instrucciones sin cambios colaterales.
2. **ZONA PROTEGIDA (CABECERO, SIDEBAR Y FLYOUT CONGELADOS).** Los siguientes archivos NO se pueden modificar visual o estructuralmente a menos que el usuario incluya la clave secreta **2680**:
   - `src/components/header.tsx` — Cabecero
   - `src/components/sidebar.tsx` — Sidebar y Flyout
   - `src/components/footer.tsx` — Pie de página (Footer)
   - globals.css o layout-shell.tsx que afecten visualmente al cabecero, sidebar o footer.
3. **Obsidian Vault (`/Users/merinop/Documents/Automatizaciones/Bobedas/Reuso/`):**
   - Al INICIAR: leer STATE.md, diarios y conceptos.
   - Al TERMINAR: registrar diario/YYYY-MM-DD.md, actualizar STATE.md y conceptos de patrones nuevos.

## STACK, COMANDOS Y ARQUITECTURA
- **Stack**: Next.js 14 App Router, TS, Tailwind, Supabase (Auth/Storage/RLS), jsPDF, Recharts, Zod.
- **Comandos**: Local: `npm run dev` / `npm run dev:clean`. Build: `npm run build` · Deploy: `vercel`.
- **Arquitectura**: (auth) `/login`, (dashboard) `/dashboard`, (empresa) `/empresa`, (admin) `/admin`, `/verificar/[codigo]`.
- **Matar caché Next**: `pkill -f "next dev" && rm -rf .next` antes de build o de pedir revisión tras cambios en múltiples archivos.

## DESIGN SYSTEM (NO INVENTAR NADA)
- Fuente autoridad: `src/design-system-SKILL-v3.md`. TODO color derivado de `#00827C`. Cero grises puros (#f5f5f5, #ccc, #333).
- Tipografía: Open Sans únicamente, sin emojis. Iconos: Phosphor Icons. Banderas: lipis/flag-icons en SVG con `borderRadius: '3px'`.
- OBLIGATORIO claro: fondos #FFFFFF/#F5FAFA/#F2F9F8, textos #1A3A38/#4D7C79/#7FA8A5, bordes rgba(0,130,124,0.12).
- OBLIGATORIO oscuro (modo noche): fondos #474747 (negro noche), textos #FFFFFF (fuente blanca), resaltado #D6F391 (pistacho). Prohibido usar otros grises en el fondo de noche, solo #474747.
- Acentos: brand #00827C, success #38B98E, error #FF5E4B, warning #F6BF3E, info #59A6E4.
- Componentes SOLO: KPICard, DataTable, Badge, StatusBadge, EmptyState, LoadingSkeleton, Modal, AlertBanner, Tabs, Button.
- Radios: 12px cards, 10px buttons, 8px inputs. Transiciones: 0.2s hovers, 0.3s modals. `user-select: auto` activo.

## TABLAS SUPABASE
- **Existentes (NO TOCAR)**: profiles, empresas, invitaciones, modulos, modulos_empresa, categorias, items, calculos, certificados, metas, tickets, mensajes_ticket, alertas, leads, logs_auditoria, config_sistema, log_firmas_confidencialidad.
- **DPP (Migración 017 ✓)**: dpp_activos, dpp_ciclos, dpp_metricas_financieras, dpp_documentos_ingesta, dpp_verificaciones.
- **Columnas nuevas (017 ✓)**: empresas (tiene_dpp, sector_dpp, moneda_preferida), items (es_activo_circular, vida_util_anos, categoria_dpp).

## ROLES, PLANES Y LÍMITES
- **Roles (RBAC)**: super_admin (/admin), empresa_admin (/empresa), empleado (/dashboard), usuario_libre (/dashboard).
- **Planes y límites mensuales**:
  | Display name | ID en BD | Cálculos/mes | Informes/mes | Certificados/mes | Cotizador | Empleados |
  |---|---|---|---|---|---|---|
  | Explora | `free` | 10 | 0 | 0 | No | 1 |
  | Circular Lab | `lab` | 200 | 5 | 2 | No | 5 |
  | Impulso Sostenible | `impulso` | 200 | 5 | 2 | Si | 10 |
  | Impacto Ilimitado | `ilimitado` | ∞ | ∞ | ∞ | Si | ∞ |
- **Invitaciones**: (1) libre -> crea empresa -> empresa_admin, (2) admin -> invita por email -> token, (3) abre link -> empleado.
- **Documentos**: Certificado (acumulado) / Informe (fechas) con código `RCO2-XXXX-YYYY` + QR.

## PROMPTS TRANSVERSALES CLAUDE CODE
1. Lee `design-system-SKILL-v3.md` antes de escribir CSS.
2. Reutiliza: co2.ts patrón, componentes design system, rutas /api/calcular patrón.
3. Voz activa e imperativos en copy y errores: "Completa el nombre" no "Falta el nombre".
4. Mobile-first estricto (375px a 768px a 1024px).
5. Sin alucinaciones (enumera valores permitidos) and sin stack traces de BD en producción (usar mensajes genéricos).
6. Rate limiting (endpoints públicos 3/min con `src/lib/rate-limit.ts`). Parámetros query validados con Zod.

## PIVOT DPP — COMPLETO (V14.0 → V14.8)
Pivot DPP completo. La Calculadora de Reúso ahora vende confianza, no solo cumplimiento. Motor CO₂ intacto, envuelto en pasaporte digital con métricas financieras (E-ROI, TCO), ingesta IA (Gemini→Qwen→Groq), verificación pública por QR y narrativa automática en voz activa para CFO.

| Bloque | Descripción | Estado |
|---|---|---|
| **DPP** | **Pasaporte Digital de Producto V1** | **✓ Completo** |

## MÓDULO COTIZADOR INTELIGENTE + CRM — COMPLETO (V6)
Objetivo: CRM comercial con diagnóstico de muebles por IA visual. El cliente manda foto, la IA clasifica (viable, tipo, oficios), el motor determinista calcula precio + CO2, el comercial valida con toggles y envía propuesta web al cliente. Seguimiento de embudo y aprendizaje continuo.
Regla de oro: la IA SOLO ve y clasifica (booleanos). NUNCA calcula precios. El código hace la matemática.
Estado: Cotizador V6 2026-06-05 — Marca personalizable (logo, footer, WhatsApp, toggle Reúso). Migración 020: 4 columnas en empresas. API /api/cotizador/marca GET+PATCH. Página /empresa/configuracion/marca con canvas WebP y preview en vivo. Propuesta pública usa whatsapp_propuesta como destino del botón dudas; footer dinámico con nombre empresa. Modo noche auditado en todas las pantallas del módulo (1 fix en configuracion/modulos divisor). TypeScript limpio. Doc técnica: cotizador-crm-resumen.md. Sidebar dinámico pendiente: requiere clave 2680.
Flujos: Cotizador IA (/empresa/cotizador) y DPP con IA (/empresa/dpp/nuevo) son independientes. La cotización migra a DPP solo si el comercial activa la casilla explícitamente.
Tablas nuevas (migración 018 + 019 + 020): crm_cotizaciones, crm_clientes, crm_muebles_cotizados, crm_config_costos, cotizador_precios, cotizador_pipeline, modulos_usuarios + columnas marca en empresas.
Keys requeridas: GEMINI_KEY, OR_KEY, GROQ_KEY, CRON_SECRET, NEXT_PUBLIC_BASE_URL (agregar a .env.local y variables de entorno en Vercel).

## PRINCIPIO FINAL
No es proyecto sobre tecnología. Es sobre CONFIANZA. Simplicidad + velocidad + confianza = éxito en LATAM.