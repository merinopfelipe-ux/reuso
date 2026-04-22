---
tags: [historial, calculos, detalle, backward-compat, detalle_json]
fecha: 2026-04-14
aliases: [historial-modal, detalle-calculo, calculo-detalle]
---

# Historial de cálculos — detalle y compatibilidad legado

## Estructura de detalle_json

El campo `detalle_json` de la tabla `calculos` tiene esta estructura (v4.3+):

```json
{
  "<item_uuid>": {
    "categoria": "Textil",
    "nombre": "Camiseta algodón",
    "peso_kg": 2.5,
    "co2": 0.875
  },
  "_descripcion_html": "<p>Donación de ropa...</p><img src='data:image/png;base64,...'/>"
}
```

Registros anteriores al Bloque 3 (pre-v4.3) usaban `cantidad: number` en vez de `peso_kg: number`.

## Cómo distinguir items de campos meta

Las claves que empiezan con `_` son campos meta (descripción, metadatos). Las UUIDs son items de materiales.

```typescript
function itemsDeDetalle(detalle): DetalleItem[] {
  return Object.entries(detalle)
    .filter(([k, v]) => !k.startsWith('_') && typeof v === 'object')
    .map(([, v]) => v as DetalleItem)
}
```

## Compatibilidad legado

```typescript
// En la UI: mostrar lo que existe
{item.peso_kg != null
  ? `${item.peso_kg} kg`     // v4.3+
  : `${item.cantidad ?? 1} u.`}  // pre-v4.3
```

## Qué muestra el panel de detalle

1. **Fecha** + nombre de usuario (si es admin/empresa_admin)
2. **KPIs**: CO₂ total (card verde) + agua total (card clara)
3. **Tabla de materiales**: nombre, categoría, peso/cantidad, CO₂
4. **Descripción HTML** (si existe `_descripcion_html`): renderizada con `dangerouslySetInnerHTML` — puede contener texto e imágenes base64

## Seguridad del dangerouslySetInnerHTML

La descripción HTML viene de datos que el mismo usuario ingresó. No viene de otros usuarios, no es un campo que pueda ser modificado por terceros. El contenido es de baja criticidad (no contiene datos sensibles). Si en el futuro se extiende a mensajes entre usuarios, se debe sanitizar (DOMPurify o similar).

## Las dos páginas que usan HistorialCalculos

| Página | Filtro de query | Columna usuario |
|---|---|---|
| `/dashboard/historial` | `user_id = yo` | No |
| `/empresa/calculos` | `empresa_id = mi empresa` | Sí |

## Dónde está implementado

- `src/components/calculadora/historial-calculos.tsx` — `itemsDeDetalle`, `DetalleModal`
- `src/app/(dashboard)/dashboard/historial/page.tsx` — página personal
- `src/app/(empresa)/empresa/calculos/page.tsx` — página empresa

## Ver también

- [[modal-panel-lateral]] — patrón del panel lateral
- [[calculo-por-kg]] — cómo se genera el detalle_json en el Bloque 3
- [[contenteditable-paste-imagenes]] — cómo se genera `_descripcion_html`
