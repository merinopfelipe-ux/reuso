---
tags: [rich-text, contenteditable, paste, imagenes, base64, clipboard-api]
fecha: 2026-04-14
aliases: [paste-imagenes, rich-text-basico, clipboard-imagenes]
---

# contentEditable con paste de imágenes (base64)

## Cuándo usar este patrón

Cuando necesitas un campo de texto libre que también acepte imágenes pegadas del portapapeles. Casos en Reúso: descripción de cálculos (evidencia fotográfica), mensajes de tickets de soporte.

No requiere librerías de rich text (Tiptap, Quill, Slate) — la lógica adicional se limita a interceptar el evento paste para imágenes.

## Implementación

```tsx
const ref = useRef<HTMLDivElement>(null)

function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
  const items = Array.from(e.clipboardData?.items ?? [])
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()  // Prevenir el comportamiento por defecto
      const blob = item.getAsFile()
      if (!blob) continue
      const reader = new FileReader()
      reader.onload = (ev) => {
        const src = ev.target?.result as string  // data:image/png;base64,...
        document.execCommand('insertHTML', false,
          `<img src="${src}" style="max-width:100%;border-radius:8px;margin:4px 0;display:block;" />`
        )
      }
      reader.readAsDataURL(blob)
      return  // Solo procesar la primera imagen del clipboard
    }
  }
  // Si no hay imagen, el texto se pega normalmente
}

return (
  <div
    ref={ref}
    contentEditable
    suppressContentEditableWarning
    onPaste={handlePaste}
    data-placeholder="Escribe aquí... o pega una imagen"
  />
)
```

## Leer el contenido para enviarlo

```typescript
const html = ref.current?.innerHTML?.trim() || undefined
// Enviar a la API como descripcion_html
```

## Placeholder con CSS puro

```css
[contenteditable]:empty:before {
  content: attr(data-placeholder);
  color: #7FA8A5;
  pointer-events: none;
}
```

Se aplica via `dangerouslySetInnerHTML` en el `<style>` del componente (necesario para evitar hydration mismatch). Ver [[hydration-style-dangerouslysetinnerhtml]].

## document.execCommand('insertHTML') — nota de deprecación

`execCommand` está deprecado en la especificación W3C pero **todos los navegadores modernos siguen soportándolo** para casos simples como este. La alternativa moderna es la Selection API + Range, que requiere ~30 líneas de código para hacer lo mismo. Para un campo de descripción con una sola interacción especial (paste de imagen), `execCommand` es pragmático y suficiente.

## Dónde está almacenada la imagen

Las imágenes se guardan como strings base64 embebidos directamente en el HTML dentro de `detalle_json._descripcion_html` en Supabase (tipo JSONB). Un PNG típico de captura de pantalla pesa 30–100 KB en base64. No se usa Supabase Storage para imágenes individuales de descripción — el costo adicional de latencia y complejidad no justifica el ahorro marginal de espacio.

## Tamaño máximo

La API acepta `descripcion_html` hasta 50.000 caracteres (validación Zod). Base64 infla el tamaño ~33%, así que 50.000 chars corresponde a ~37 KB de imagen original. Si el usuario pega una imagen muy grande, el texto se truncará en la validación Zod.

## Dónde está implementado

- `src/components/calculadora/calculadora.tsx` — campo descripción del cálculo
- `src/app/api/calcular/route.ts` — `descripcion_html` en schema Zod + `detalle_json._descripcion_html`

## Ver también

- [[calculo-por-kg]] — el cálculo al que pertenece este campo de descripción
- [[hydration-style-dangerouslysetinnerhtml]] — por qué el `<style>` usa dangerouslySetInnerHTML
