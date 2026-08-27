# Diagnóstico multi-imagen del Cotizador — V1.0, terreno preparado para DPP V2.0

## Contexto

El usuario describió el flujo de creación de cotización que espera: elegir el cliente, subir una o varias fotos, que la IA agrupe o separe los muebles que ve, y que el editor permita ajustar todo antes de confirmar. Preguntó específicamente si convenía recortar una foto para aislar un ítem cuando hay varios en la misma imagen, y si convenía precargar datos de DPP (ej. valor de mercado) desde esta primera consulta para no gastar tokens dos veces.

Investigación previa (agente Explore) confirmó el estado real del código antes de diseñar: la IA de diagnóstico ya detectaba varios ítems por foto, pero solo aceptaba **una** foto por análisis, no recortaba nada, y el peso/CO2/materiales siempre salían del catálogo (nunca los inventa la IA). El valor de mercado ya existe como una llamada de IA **separada y asíncrona** (`dispararPrecioMercado`, con búsqueda web), disparada después de confirmar cada ítem — no tenía sentido fusionarla con la clasificación visual, son dos tipos de tarea de IA distintos.

## Decisión sobre DPP (V2.0) — cero cambios hoy

Los campos que pedirá el DPP (`material`, `peso_kg`, `factor_co2_kg`, `origen_fuente`, `nivel_confianza`) ya son exactamente los que trae `item_materiales` del catálogo, y la cotización ya los guarda hoy en su propio snapshot (`crm_muebles_cotizados.materiales_json`). No se agregó ningún campo nuevo ni se disparó ninguna llamada de IA adicional pensando en DPP — cuando V2.0 exista, "crear DPP desde una cotización ganada" copiará estos campos ya guardados en vez de volver a preguntarlos. Cero trabajo desperdiciado en cotizaciones que nunca se convierten en DPP.

## Qué cambió (V1.0)

### 1. Subida multi-imagen
- El input de archivo ahora acepta varias fotos a la vez (`multiple`), hasta **6 por tanda**.
- El pegado (Cmd+V) recorre TODOS los ítems del portapapeles, no solo el primero.
- Cualquier archivo que no sea imagen (ej. un video) se descarta explícitamente con mensaje ("Solo se aceptan imágenes..."), en vez del rechazo silencioso de antes.

### 2. Una sola llamada a Gemini por tanda, no una por foto
`POST /api/cotizador/diagnostico` pasó de recibir `imagen_base64` (una) a `imagenes: [{ imagen_base64, mime_type }]` (1 a 6). El prompt/catálogo/few-shot se paga una sola vez por tanda, no una vez por foto — más barato que analizar foto por foto. Cada ítem detectado ahora incluye `imagen_index` (de cuál foto salió) y opcionalmente `bounding_box` (recuadro 0-1000, convención Gemini) cuando hay más de un mueble distinto en la misma foto.

### 3. Recorte automático por IA (bounding box)
Nueva librería compartida `src/lib/image-compress.ts`:
- `comprimirImagenWebP` / `comprimirImagenBase64` — la misma lógica de compresión que ya existía, ahora en un solo lugar (antes estaba duplicada casi idéntica entre el Cotizador y el DPP, con calidades distintas 0.70 vs 0.85 — ahora es un parámetro, mismo comportamiento en ambos).
- `recortarImagenBase64` — recorta la región de un `bounding_box` normalizado sobre la imagen ya comprimida en memoria (sin gastar IA en el recorte en sí, solo se usa la coordenada que Gemini ya devolvió).
- `boundingBoxEsUtil` — salvaguarda: si el recuadro no viene, es inválido, o cubre más del 92% de la foto, se usa la foto completa. El recorte nunca puede romper el flujo.

Cada ítem detectado ahora tiene su propia miniatura (recortada o la foto completa) y su propio `imagen_base64` para subir — ya no comparten la misma imagen sin recortar cuando dos ítems salen de la misma foto, cada uno sube la suya.

### 4. Editor: miniatura por tarjeta + duplicar
`GrupoItemCard` ahora muestra la miniatura del ítem (antes no mostraba ninguna imagen, solo texto) y un botón "duplicar" junto al de eliminar, para cuando el asesor ve que en realidad hay más unidades de las que la IA contó, sin tener que resubir nada.

## Fuera de este ciclo
- Recorte manual (el usuario pidió automático por IA, no manual).
- Cualquier dato o llamada de IA específica de DPP — confirmado explícitamente que se pospone a V2.0.

## Verificación
- `npx tsc --noEmit` y `npx eslint` limpios en los 5 archivos tocados (`src/lib/image-compress.ts`, `dpp/nuevo/page.tsx`, `diagnostico/route.ts`, `cotizador/nueva/page.tsx`, `grupo-item-card.tsx`).
- Servidor reiniciado, `/empresa/cotizador/nueva` y `/empresa/dpp/nuevo` responden sin error 500.
- Pendiente de probar en vivo con sesión real: subir 2+ fotos con más de un mueble por foto y confirmar que el recorte automático se ve bien; si el recorte del modelo sale mal en la práctica, la salvaguarda ya construida (`boundingBoxEsUtil`) cae sola a la foto completa sin romper nada.
