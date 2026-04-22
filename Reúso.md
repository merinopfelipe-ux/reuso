---
tags: [inicio, reuso, indice]
aliases: [inicio, home, index]
---

# Calculadora de Reúso

> Plataforma SaaS que certifica el CO₂ evitado al reutilizar objetos.
> **Producto de Grupo MLP S.A.S.** · reuso.lurdes.co · servicio@lurdes.co

---

## Estado actual

→ Ver [[STATE]] para el estado de bloques y pendientes de producción.
**Versión actual: V5.1** — Todos los bloques completos. Build: ✓ 0 errores.

---

## Navegación del vault

### Diario de sesiones
| Fecha | Versión | Resumen |
|-------|---------|---------|
| [[diario/2026-04-18\|2026-04-18]] | V5.1 | Vault organizado + 8 bugs corregidos |
| [[diario/2026-04-17\|2026-04-17]] | V4.8→V5.0 | Bloque 7-10: landing, verificar, módulos, admin contenido/plantillas/certs |
| [[diario/2026-04-14\|2026-04-14]] | V3.8→V4.1 | Plan maestro + Bloque 0 + Bloque 1 |
| [[diario/2026-04-14-bloque2\|2026-04-14 Bloque 2]] | V4.2 | Roles separados / sidebar por rol |
| [[diario/2026-04-14-bloque3\|2026-04-14 Bloque 3]] | V4.3 | Calculadora completa |
| [[diario/2026-04-14-bloque4\|2026-04-14 Bloque 4]] | V4.4-V4.5 | Historial + Tickets + Metas |
| [[diario/2026-04-14-bugfix-post-bloque6\|2026-04-14 Bugfixes]] | V4.5 | Correcciones post-Bloque 6 |
| [[diario/2026-04-13\|2026-04-13]] | V3.8 | Hidratación, ancho, roles, perfil, certificados |
| [[diario/2026-04-10\|2026-04-10]] | V3.7 | Landing, rebranding reuso.bio → reuso.lurdes.co |
| [[diario/2026-04-06\|2026-04-06]] | V3.3→V3.4 | Legales completos, tablas ordenables, /ayuda |
| [[diario/2026-04-05\|2026-04-05]] | V3.2 | Base del proyecto |

### Conceptos técnicos clave
- [[conceptos/plan-maestro-reuso-v4|Plan Maestro V4]] — 10 bloques completados ✓
- [[conceptos/calculo-por-kg|Cálculo por kg]] — factores de emisión, inmutabilidad
- [[conceptos/role-routing-nextjs|Routing por rol]] — guards, redirects
- [[conceptos/modo-empleado-cookie|Modo colaborador]] — cookie para empresa_admin
- [[conceptos/verificar-codigo-ilike|Búsqueda código verificación]] — ilike + normalización
- [[conceptos/useSearchParams-suspense-nextjs|useSearchParams + Suspense]]
- [[conceptos/hydration-style-dangerouslysetinnerhtml|Hidratación inline styles]]
- [[conceptos/n-plus-one-supabase|N+1 en Supabase]] — consultas eficientes
- [[conceptos/supabase-upsert-onconflict|Upsert con onConflict]]
- [[conceptos/webpack-cache-nextjs|Caché webpack corrupta]] — pkill + rm -rf .next

### Diseño
Imágenes de referencia UI en carpeta `diseno/`:
- `ejemplo-landing.png` — referencia de diseño landing
- `ejemplo-ui.jpg` — referencia panel autenticado
- `logo-completo.svg` / `logo-icono.svg` / `logo-texto.svg`

---

## Arquitectura rápida

```
app/(auth)/       → /login, /registro, /recuperar, /invitacion
app/(dashboard)/  → empleado + usuario_libre
app/(empresa)/    → empresa_admin
app/(admin)/      → super_admin
app/verificar/    → verificación pública (sin auth)
app/api/          → server-side only
```

## Planes

| Plan | ID | Cálculos/mes | Empleados | Certs/mes |
|------|----|-------------|-----------|-----------|
| Explora | `free` | 10 | 1 | 0 |
| Circular Lab | `lab` | 200 | 5 | 2 |
| Impulso Sostenible | `impulso` | 200 | 10 | 2 |
| Impacto Ilimitado | `ilimitado` | ∞ | ∞ | ∞ |

---

## Pendientes para producción

Ver [[STATE]] sección "Checklist para producción".
