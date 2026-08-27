---
tags: [dashboard, roles, kpi, ux, server-component, usuario_libre, empleado]
fecha: 2026-04-14
aliases: [dashboard-por-rol, bifurcacion-dashboard, dashboard-empleado, dashboard-libre]
---

# Dashboard bifurcado por rol

## El patrón

La página `/dashboard` detecta el rol en el servidor y muestra contenido diferente según si el usuario es `empleado` (con empresa) o `usuario_libre`. La bifurcación ocurre en el Server Component — no hay lógica en el cliente.

```typescript
// dashboard/page.tsx
const rol = (perfil?.rol ?? 'usuario_libre') as Rol
const empresa_id = perfil?.empresa_id ?? null

// KPIs: empresa para empleado, personales para los demás
{rol === 'empleado' && empresa_id ? (
  <KpisEmpresa />
) : (
  <KpisPersonales />
)}

// Cuota + upgrade banner: solo usuario_libre
{rol === 'usuario_libre' && <CuotaYBanner />}

// Accesos rápidos: solo empleado
{rol === 'empleado' && <AccesosRapidos />}
```

## Qué ve cada rol

### empleado (con empresa_id)
1. Saludo + badge empresa + ranking de posición
2. **KPIs empresa:** CO₂ total empresa, agua empresa, registros empresa, mi aporte CO₂
3. **Accesos rápidos:** Registrar reúso / Mi historial / Soporte (3 cards antes de la calculadora)
4. Gráfica personal de evolución mensual
5. Calculadora + historial + informes

### usuario_libre
1. Saludo sin badge
2. **KPIs personales:** CO₂, agua, objetos, árboles
3. **Contador de cuota:** "X / 10 cálculos este mes" con barra de progreso (verde → rojo al llegar al límite)
4. **Banner upgrade:** "Desbloquea funciones corporativas — Crea tu empresa desde $89.000 COP/mes" + botón
5. Gráfica personal + calculadora + historial + informes

## Queries adicionales para la bifurcación

```typescript
// Solo si rol === 'empleado' && empresa_id:
adminClient.from('calculos')
  .select('total_co2, total_agua')
  .eq('empresa_id', empresa_id)

// Solo si rol === 'usuario_libre':
adminClient.from('calculos')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .gte('fecha', primerDiaMes.toISOString())
```

Ambas queries se hacen de forma condicional en el `Promise.all`. Si no aplican, se resuelven inmediatamente con arrays vacíos — costo cero.

## Cuota Free: lógica del contador

La cuota es `CUOTA_FREE = 10` cálculos por mes. El contador se resetea el día 1 (la query usa `gte primerDiaMes`). El color de la barra cambia:
- Verde (`var(--color-brand)`) mientras `calculosMes < CUOTA_FREE`
- Rojo (`#FF5E4B`) cuando `calculosMes >= CUOTA_FREE`

La validación real de que no pueda superar el límite la hace `checkLimiteCalculos` en la API route. El contador en el dashboard es UX informativa, no de control.

## Accesos rápidos del empleado

Son `<a>` tags (no `<Link>`) para no disparar prefetch a rutas que aún no existen (historial y soporte se implementan en Bloques 4 y 5).

## Dónde está implementado

- `src/app/(dashboard)/dashboard/page.tsx` — toda la bifurcación

## Ver también

- [[conceptos/finanzas-circulares|Finanzas Circulares & Valor del Producto]]
- [[conceptos/cotizador-crm-multiempresa|Cotizador B2B y CRM]]
- [[conceptos/pasaporte-digital-dpp|Pasaporte Digital de Producto (DPP)]]
- [[conceptos/sidebar-items-por-rol|Navegación y Menús por Rol]]
- [[conceptos/modo-empleado-cookie|Modo Colaborador para Empresa Admin]]
