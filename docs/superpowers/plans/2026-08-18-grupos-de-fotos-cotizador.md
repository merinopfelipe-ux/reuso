# Grupos de fotos en /empresa/cotizador/nueva — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Nota de esta sesión:** se ejecuta inline, en la misma sesión, sin subagentes ni checkpoints — el usuario pidió que quede construido ya mismo.

**Goal:** Cada "grupo de fotos" en `/empresa/cotizador/nueva` produce UN solo ítem (no detección multi-ítem), con selector de foto principal, botón fijo para agregar otro grupo, tope de 3 grupos por cotización, y "Genera la propuesta" deshabilitado hasta el primer grupo confirmado.

**Architecture:** Todo el cambio vive en 2 archivos ya existentes: `page.tsx` (estado y flujo) y `grupo-item-card.tsx` (UI de la tarjeta). Nuevo estado `gruposUsados` (contador, no derivado de `muebles.length` porque el rescate no cuenta). `continuarManual()` deja de mapear 1 tarjeta por foto. La selección de 1 candidato en modo IA se hace con un botón "Elegir este ítem" por tarjeta que colapsa `itemsDetectados` a un solo elemento. El selector de "foto principal" es un prop nuevo (`fotosGrupo`) que `GrupoItemCard` usa para ofrecer miniaturas clicables que sobrescriben `imagenPreview`/`imagenBase64` vía el `onChange` que ya existe.

**Tech Stack:** Next.js 14 App Router, React state local (sin store nuevo), TypeScript, Tailwind. Sin cambios de backend/API — todo es UI y flujo cliente.

---

### Task 1: Contador de grupos + un ítem por grupo en modo Manual

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:191` (declarar estado), `:418-429` (`continuarManual`), `:580-588` (dentro de `handleConfirmarTodos`)

- [ ] **Paso 1: declarar el estado `gruposUsados`**

En `page.tsx`, justo después de la línea `const [muebles, setMuebles] = useState<MuebleAgregado[]>([])` (línea 191), agrega:

```ts
  // Sube en 1 SOLO al confirmar el ítem resultante de un grupo de fotos (IA
  // o Manual) — nunca vía "rescate" (Buscar en catálogo / Agregar ítem que
  // no existe), esos no consumen un grupo. Tope: 3 grupos por cotización
  // nueva, ver JSX del botón "+ Agregar otro grupo de fotos" más abajo.
  const [gruposUsados, setGruposUsados] = useState(0)
```

- [ ] **Paso 2: `continuarManual()` crea 1 sola tarjeta, no 1 por foto**

Reemplaza la función completa (líneas 418-429):

```ts
  function continuarManual() {
    if (fotos.length === 0) return
    setError(null)
    // Un solo ítem por grupo, sin importar cuántas fotos tenga — usa la
    // primera como imagen por defecto, el vendedor puede cambiarla desde el
    // selector de "foto principal" dentro de GrupoItemCard (ver Task 3).
    const item = construirItemStub({
      imagenIndex: 0, imagenPreview: fotos[0].preview, imagenBase64: fotos[0].base64,
    })
    setItemsDetectados([item])
    setNoIdentificados([])
    setSinMatch([])
    setObservaciones('')
    setEstado('resultado')
  }
```

- [ ] **Paso 3: incrementar `gruposUsados` al confirmar**

En `handleConfirmarTodos`, la línea `setMuebles(prev => [...prev, ...nuevos])` (línea 580) va seguida hoy de `for (const nuevo of nuevos) dispararPrecioMercado(nuevo.id)`. Justo después de ese `for`, antes del comentario `// Reiniciar para agregar otra tanda de fotos`, agrega:

```ts
      setMuebles(prev => [...prev, ...nuevos])
      for (const nuevo of nuevos) dispararPrecioMercado(nuevo.id)
      setGruposUsados(g => g + 1)

      // Reiniciar para agregar otra tanda de fotos
      setEstado('idle')
```

- [ ] **Paso 4: verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin salida (limpio).

- [ ] **Paso 5: commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/nueva/page.tsx"
git commit -m "feat: contador de grupos de fotos + un solo ítem en modo Manual"
```

---

### Task 2: Selector de "foto principal" dentro de GrupoItemCard

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx`

- [ ] **Paso 1: agregar el prop `fotosGrupo` a la interfaz `Props`**

En `grupo-item-card.tsx`, la interfaz `Props` (líneas 29-36) queda:

```ts
interface Props {
  item: ItemConImagen
  catalogo: ItemCatalogo[]
  conEmpresa: (url: string) => string
  onChange: (item: ItemConImagen) => void
  onQuitar: () => void
  onDuplicar: () => void
  // Fotos crudas del grupo (antes de recortar/procesar) — solo se pasa
  // cuando el grupo tiene MÁS de 1 foto, para ofrecer el selector de "foto
  // principal". Con 1 sola foto en el grupo no hace falta preguntar.
  fotosGrupo?: { base64: string; preview: string }[]
  // Presente SOLO cuando hay más de 1 candidato detectado por la IA sin
  // elegir todavía — pinta el botón "Elegir este ítem" en el encabezado.
  onElegir?: () => void
}
```

- [ ] **Paso 2: recibir los props nuevos en la firma del componente**

Cambia la línea 49 de:

```ts
export function GrupoItemCard({ item, catalogo, conEmpresa, onChange, onQuitar, onDuplicar }: Props) {
```

a:

```ts
export function GrupoItemCard({ item, catalogo, conEmpresa, onChange, onQuitar, onDuplicar, fotosGrupo, onElegir }: Props) {
```

- [ ] **Paso 3: botón "Elegir este ítem" en el encabezado de la Tarjeta 1**

En el bloque de acciones del encabezado (líneas 140-147), que hoy es:

```tsx
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onDuplicar} className="hover-pop hover-press p-1.5" title="Duplicar este ítem">
              <Copy size={15} className={ts} />
            </button>
            <button onClick={onQuitar} className="hover-pop hover-press p-1.5" title="Quitar de la cotización">
              <Trash size={15} className="text-[#FF5E4B]" />
            </button>
          </div>
```

reemplázalo por:

```tsx
          <div className="flex items-center gap-1 flex-shrink-0">
            {onElegir && (
              <button
                type="button"
                onClick={onElegir}
                className="text-xs font-semibold text-white bg-[#00827C] rounded-full px-3 py-1.5 hover-pop hover-press mr-1"
              >
                Elegir este ítem
              </button>
            )}
            <button onClick={onDuplicar} className="hover-pop hover-press p-1.5" title="Duplicar este ítem">
              <Copy size={15} className={ts} />
            </button>
            <button onClick={onQuitar} className="hover-pop hover-press p-1.5" title="Quitar de la cotización">
              <Trash size={15} className="text-[#FF5E4B]" />
            </button>
          </div>
```

- [ ] **Paso 4: selector de miniaturas justo después de la imagen principal**

Después del bloque de la imagen (líneas 150-157, termina en `)}` antes de `<div>` de "Coincidencia de categoría"), agrega un nuevo bloque:

```tsx
        {item.imagenPreview && (
          <div className="w-full flex items-center justify-center rounded-[12px] bg-[var(--bg-input)] overflow-hidden">
            <img src={item.imagenPreview} alt="" className="h-48 w-auto max-w-full object-contain" />
          </div>
        )}

        {fotosGrupo && fotosGrupo.length > 1 && (
          <div>
            <label className={`text-xs font-bold tracking-wide mb-1.5 block ${ts}`}>Foto principal</label>
            <div className="flex gap-2 overflow-x-auto">
              {fotosGrupo.map((f, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange({ ...item, imagenPreview: f.preview, imagenBase64: f.base64 })}
                  className={`flex-shrink-0 rounded-[8px] overflow-hidden border-2 transition-colors ${
                    item.imagenPreview === f.preview ? 'border-[#00827C]' : 'border-transparent'
                  }`}
                  title="Usar esta foto como principal"
                >
                  <img src={f.preview} alt="" className="h-14 w-14 object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={`text-xs font-bold tracking-wide mb-1.5 block ${ts}`}>Coincidencia de categoría</label>
```

(el bloque `{item.imagenPreview && (...)}` ya existía — solo se agrega el nuevo `{fotosGrupo && ...}` justo debajo, antes del `<div>` de "Coincidencia de categoría" que ya existía).

- [ ] **Paso 5: verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx"`
Expected: sin salida en ambos.

- [ ] **Paso 6: commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx"
git commit -m "feat: selector de foto principal y botón elegir ítem en GrupoItemCard"
```

---

### Task 3: Modo IA — elegir 1 candidato, no agregar todos

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:975-985` (map de `itemsDetectados`)

- [ ] **Paso 1: función `elegirCandidato`**

Justo después de `duplicarDetectado` (termina en la línea 474 con `}`), agrega:

```ts
  // Modo IA con más de 1 candidato: elegir uno colapsa itemsDetectados a
  // solo ese — el grupo de fotos siempre produce UN ítem, nunca varios.
  function elegirCandidato(index: number) {
    setItemsDetectados(prev => prev[index] ? [prev[index]] : prev)
  }
```

- [ ] **Paso 2: pasar `fotosGrupo` y `onElegir` al mapear `itemsDetectados`**

Cambia el bloque (líneas 975-985):

```tsx
            {itemsDetectados.map((item, i) => (
              <GrupoItemCard
                key={item._uiKey ?? i}
                item={item}
                catalogo={catalogo}
                conEmpresa={conEmpresa}
                onChange={(nuevo) => actualizarItem(i, nuevo)}
                onQuitar={() => quitarDetectado(i)}
                onDuplicar={() => duplicarDetectado(i)}
              />
            ))}
```

a:

```tsx
            {itemsDetectados.map((item, i) => (
              <GrupoItemCard
                key={item._uiKey ?? i}
                item={item}
                catalogo={catalogo}
                conEmpresa={conEmpresa}
                fotosGrupo={fotos}
                onElegir={modo === 'ia' && itemsDetectados.length > 1 ? () => elegirCandidato(i) : undefined}
                onChange={(nuevo) => actualizarItem(i, nuevo)}
                onQuitar={() => quitarDetectado(i)}
                onDuplicar={() => duplicarDetectado(i)}
              />
            ))}
```

- [ ] **Paso 3: verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Paso 4: commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/nueva/page.tsx"
git commit -m "feat: elegir 1 candidato en modo IA en vez de agregar todos"
```

---

### Task 4: Botón fijo "+ Agregar otro grupo de fotos" + tope de 3 + "Genera la propuesta" deshabilitado

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:841` (zona de carga), `:1075-1103` (barra sticky)

- [ ] **Paso 1: función `iniciarNuevoGrupo`**

Justo después de `handleGenerarPropuesta` (termina línea 598 con `}`), agrega:

```ts
  // Botón fijo "+ Agregar otro grupo de fotos" de la barra inferior —
  // descarta cualquier revisión sin confirmar del grupo actual (si la
  // había) y vuelve a la zona de carga en blanco.
  function iniciarNuevoGrupo() {
    setEstado('idle')
    setFotos([])
    setItemsDetectados([])
    setNoIdentificados([])
    setSinMatch([])
    setError(null)
  }
```

- [ ] **Paso 2: la zona de carga respeta el tope de 3 grupos**

Cambia la línea 841 de:

```tsx
        {cliente && estado === 'idle' && (
```

a:

```tsx
        {cliente && estado === 'idle' && gruposUsados < 3 && (
```

- [ ] **Paso 3: aviso de tope alcanzado**

Justo después del bloque que cierra en la línea 932 (`</div>\n        )}`, el que termina la zona de carga), agrega el aviso — antes del comentario `{/* Analizando */}` (línea 934):

```tsx
        {cliente && estado === 'idle' && gruposUsados >= 3 && (
          <div className={`rounded-[12px] border p-6 text-center ${cardBg}`}>
            <p className={`text-sm mb-3 ${ts}`}>Ya agregaste 3 ítems a esta cotización. Para agregar más, edítala después de guardarla.</p>
            {cotizacionId && (
              <Button variant="secondary" onClick={() => router.push(conEmpresa(`/empresa/cotizador/${cotizacionId}`))}>
                Ir a la cotización
              </Button>
            )}
          </div>
        )}

```

- [ ] **Paso 4: botón fijo en la barra sticky, antes de "Genera la propuesta"**

Cambia el bloque (líneas 1078-1100):

```tsx
          <div className="w-full max-w-[1440px] mx-auto flex flex-col sm:flex-row gap-3 px-4 sm:px-6 lg:px-8">
            {(estado === 'resultado' || estado === 'guardando') && (
              <Button
                onClick={handleConfirmarTodos}
                disabled={itemsDetectados.length === 0}
                loading={estado === 'guardando'}
                icon={<Plus size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                {estado === 'guardando' ? 'Guardando...' : 'Agregar a la cotización'}
              </Button>
            )}
            {(cotizacionId || muebles.length > 0) && (
              <Button
                variant="secondary"
                onClick={handleGenerarPropuesta}
                disabled={estado === 'guardando'}
                icon={<ArrowRight size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                Genera la propuesta
              </Button>
            )}
          </div>
```

a:

```tsx
          <div className="w-full max-w-[1440px] mx-auto flex flex-col sm:flex-row gap-3 px-4 sm:px-6 lg:px-8">
            {(estado === 'resultado' || estado === 'guardando') && (
              <Button
                onClick={handleConfirmarTodos}
                disabled={itemsDetectados.length === 0}
                loading={estado === 'guardando'}
                icon={<Plus size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                {estado === 'guardando' ? 'Guardando...' : 'Agregar a la cotización'}
              </Button>
            )}
            {estado === 'idle' && gruposUsados < 3 && (
              <Button
                variant="secondary"
                onClick={iniciarNuevoGrupo}
                icon={<Plus size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                Agregar otro grupo de fotos
              </Button>
            )}
            {(cotizacionId || muebles.length > 0) && (
              <Button
                variant="secondary"
                onClick={handleGenerarPropuesta}
                disabled={estado === 'guardando' || gruposUsados === 0}
                icon={<ArrowRight size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                Genera la propuesta
              </Button>
            )}
          </div>
```

Nota: el botón "Agregar otro grupo de fotos" en la barra sticky solo se muestra en `estado === 'idle'` (cuando ya existe la zona de carga arriba, para no competir con ella ni permitir descartar una revisión a medias sin darse cuenta) — es el mismo botón que pide el punto 4 de la spec, ahora fijo en la barra inferior en vez de flotar solo arriba, así siempre es visible junto con "Genera la propuesta" apenas hay cliente identificado.

- [ ] **Paso 5: verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Paso 6: commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/nueva/page.tsx"
git commit -m "feat: botón fijo agregar otro grupo, tope de 3 grupos, Genera la propuesta deshabilitado sin grupos"
```

---

### Task 5: Verificación manual completa

- [ ] **Paso 1: lint final de ambos archivos**

Run: `npx eslint "src/app/(empresa)/empresa/cotizador/nueva/page.tsx" "src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx"`
Expected: sin salida.

- [ ] **Paso 2: reiniciar PM2 limpio**

```bash
npx pm2 stop reuso && rm -rf .next && npx pm2 flush && npx pm2 restart reuso --update-env && sleep 6
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```
Expected: `200`

- [ ] **Paso 3: prueba manual en el navegador (avisar al usuario para que la haga o hacerla con el navegador si hay acceso)**

1. Entrar a `/empresa/cotizador/nueva`, identificar un cliente.
2. Confirmar que "Genera la propuesta" aparece gris/deshabilitado (0 grupos).
3. Subir un grupo de 2-3 fotos, modo Con IA, analizar.
4. Si la IA detecta más de 1 candidato: confirmar que aparece "Elegir este ítem" en cada tarjeta, y que al hacer clic en una, las demás desaparecen.
5. Confirmar que aparece el selector "Foto principal" (si el grupo tenía más de 1 foto) y que cambiar la selección actualiza la miniatura de la tarjeta.
6. Confirmar el ítem — verificar que "Genera la propuesta" deja de estar deshabilitado.
7. Repetir con modo Manual: confirmar que aparece 1 sola tarjeta (no una por foto).
8. Repetir hasta llegar a 3 grupos — confirmar que la zona de carga y el botón "Agregar otro grupo de fotos" desaparecen, y aparece el aviso con el botón a la cotización.
9. Confirmar que "Buscar en catálogo" desde un ítem no reconocido sigue funcionando y NO cuenta contra el tope de 3.

- [ ] **Paso 4: actualizar la spec con el estado real**

En `docs/superpowers/specs/2026-08-17-grupos-de-fotos-cotizador-design.md`, agrega al final una línea: `**Estado: implementado 2026-08-18.**`

```bash
git add docs/superpowers/specs/2026-08-17-grupos-de-fotos-cotizador-design.md
git commit -m "docs: marca la spec de grupos de fotos como implementada"
```
