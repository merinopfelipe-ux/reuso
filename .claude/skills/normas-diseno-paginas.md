# Normas de diseño de páginas — Calculadora de Reúso

## Norma: páginas de detalle deben compartir el mismo layout base

Todas las páginas de detalle (lead, cliente CRM, DPP, cotización, perfil de empresa) comparten el mismo layout:

```
max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5
```

Y la misma estructura visual:
1. **Encabezado**: flecha volver + título + fecha de creación
2. **Acciones rápidas** (si aplica): botones de acción directa (WhatsApp, correo, etc.)
3. **Secciones de datos**: `rounded-2xl border border-(--border) bg-(--bg-card) p-4 sm:p-5`
4. **Pie de página**: botón Guardar + botón Volver

Los campos varían según la entidad, pero el contenedor, el espaciado, el tipo de input, la etiqueta (`text-xs font-semibold text-(--text-secondary)`) y el estilo de campo (`rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm`) son idénticos en todas.

**Referencia canónica actual**: `src/app/(admin)/admin/leads/[id]/lead-detalle-client.tsx`

Antes de escribir una nueva página de detalle o rediseñar una existente, leer esa página completa y copiar su estructura, reemplazando solo los campos y la lógica de negocio.

## Norma: reutilización de componentes en páginas de detalle

- Notas internas: usar `src/lib/notas-lead.ts` + patrón de textarea + lista con fecha/autor (o el componente `HiloNotas` para notas más conversacionales).
- Botón guardar: siempre `<Button onClick={guardar} loading={guardando}>`.
- Toasts: siempre `useToast()` — nunca `alert()` ni mensajes inline para confirmaciones de éxito.
- Inputs de teléfono: siempre `<InputTelefono>` — nunca `<input type="tel">` suelto.
- Selectores: siempre `<Selector>` — nunca `<select>` nativo.

## Componentes canónicos — usar siempre, no reinventar

### Páginas de detalle: `src/components/ui/detalle-pagina.tsx`
Tres piezas para cualquier página de detalle (lead, cliente, DPP, cotización):

```tsx
import { DetallePagina, SeccionDetalle, PieDetalle } from '@/components/ui/detalle-pagina'

<DetallePagina cargando={cargando} errorFatal={error}>
  <SeccionDetalle titulo="Datos del contacto" acciones={<button>...</button>}>
    {/* campos */}
  </SeccionDetalle>
  <PieDetalle onGuardar={guardar} guardando={guardando} hrefVolver="/lista" />
</DetallePagina>
```

- `DetallePagina`: contenedor `max-w-3xl`, maneja estado cargando (skeleton) y error fatal.
- `SeccionDetalle`: card `rounded-2xl border bg-(--bg-card)` con título y acciones opcionales.
- `PieDetalle`: fila de botones Guardar + Volver. Prop `extra` para mensajes de error inline.

### Selector de empresa para super_admin: `src/components/ui/contexto-empresa.tsx`
Para páginas de empresa donde el super_admin debe elegir empresa como paso previo:

```tsx
import { ContextoEmpresa } from '@/components/ui/contexto-empresa'

{esSuperAdmin && (
  <ContextoEmpresa
    empresas={empresas}
    value={empresaId ?? ''}
    onChange={cambiarEmpresa}
    etiqueta="Viendo clientes de"
    mensajeVacio="Selecciona una empresa para ver sus clientes."
    listo={!cargandoContexto}
  />
)}
```

Incluye el bloque selector (ícono + etiqueta + `SelectorEmpresa`) y el aviso azul de "elige una empresa" cuando no hay ninguna seleccionada. Nunca duplicar este bloque por página.

## Ejemplo de estructura mínima

```tsx
<div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
  {/* 1. Encabezado */}
  <div className="flex items-center justify-between gap-3 flex-wrap">
    <Link href="/ruta-lista">← Volver</Link>
    <span className="text-xs text-(--text-placeholder)">Fecha</span>
  </div>

  {/* 2. Título */}
  <h1 className="text-2xl font-semibold text-(--text-primary)">Nombre</h1>

  {/* 3. Sección de datos */}
  <section className="rounded-2xl border border-(--border) bg-(--bg-card) p-4 sm:p-5 flex flex-col gap-4">
    <h2 className="text-base font-semibold text-(--text-primary) m-0">Sección</h2>
    {/* campos */}
  </section>

  {/* 4. Pie */}
  <div className="flex items-center gap-3">
    <Button onClick={guardar} loading={guardando}>Guardar</Button>
    <Button variant="secondary">Volver</Button>
  </div>
</div>
```
