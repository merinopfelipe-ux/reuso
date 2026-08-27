// Compresión y recorte de imágenes en el navegador — compartido entre el
// Cotizador (calidad 0.70, para minimizar tokens en la llamada a IA) y el
// DPP (calidad 0.85, para la imagen final que se guarda). Antes había dos
// copias casi idénticas de esta misma lógica en cada flujo por separado.
// Directriz del proyecto: SIEMPRE minimizar tokens en cualquier llamada a IA.

export interface ComprimirOpciones {
  maxLado?: number
  calidad?: number
}

// Recuadro normalizado 0-1000, misma convención que usa Gemini para
// bounding boxes (evita tener que reescalar en el prompt).
export interface BoundingBox {
  y_min: number
  x_min: number
  y_max: number
  x_max: number
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen.'))
    img.src = src
  })
}

function canvasABlob(canvas: HTMLCanvasElement, calidad: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen.')),
      'image/webp',
      calidad
    )
  })
}

function blobABase64(blob: Blob): Promise<{ base64: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve({ base64: dataUrl.split(',')[1] ?? '', preview: dataUrl })
    }
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.readAsDataURL(blob)
  })
}

/** Redimensiona (máx `maxLado` de lado mayor, nunca upscale) y comprime a WebP. Devuelve un Blob. */
export async function comprimirImagenWebP(archivo: Blob, opciones: ComprimirOpciones = {}): Promise<Blob> {
  const { maxLado = 1200, calidad = 0.70 } = opciones
  const objectUrl = URL.createObjectURL(archivo)
  try {
    const img = await cargarImagen(objectUrl)
    const ratio = Math.min(maxLado / img.width, maxLado / img.height, 1)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * ratio)
    canvas.height = Math.round(img.height * ratio)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo preparar el lienzo.')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await canvasABlob(canvas, calidad)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** Igual que `comprimirImagenWebP`, pero devuelve también el base64 (para IA) y el data URL completo (para mostrar). */
export async function comprimirImagenBase64(archivo: Blob, opciones: ComprimirOpciones = {}): Promise<{ base64: string; preview: string }> {
  const blob = await comprimirImagenWebP(archivo, opciones)
  return blobABase64(blob)
}

/**
 * Recorta una región normalizada (0-1000, convención Gemini) de una imagen
 * YA comprimida (su data URL en memoria) y devuelve el recorte, también
 * comprimido. El llamador decide cuándo usar esto vs. la foto completa
 * (recuadro ausente, inválido, o que cubre casi toda la foto).
 */
export async function recortarImagenBase64(
  dataUrlOriginal: string,
  bbox: BoundingBox,
  opciones: ComprimirOpciones = {}
): Promise<{ base64: string; preview: string }> {
  const img = await cargarImagen(dataUrlOriginal)
  const x = Math.max(0, (bbox.x_min / 1000) * img.width)
  const y = Math.max(0, (bbox.y_min / 1000) * img.height)
  const w = Math.min(img.width - x, ((bbox.x_max - bbox.x_min) / 1000) * img.width)
  const h = Math.min(img.height - y, ((bbox.y_max - bbox.y_min) / 1000) * img.height)
  if (w < 10 || h < 10) throw new Error('Recuadro de recorte demasiado pequeño.')

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w)
  canvas.height = Math.round(h)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo preparar el recorte.')
  ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height)
  const blob = await canvasABlob(canvas, opciones.calidad ?? 0.70)
  return blobABase64(blob)
}

/** ¿Vale la pena recortar este recuadro, o es básicamente la foto completa? */
export function boundingBoxEsUtil(bbox: BoundingBox | null | undefined): bbox is BoundingBox {
  if (!bbox) return false
  const { y_min, x_min, y_max, x_max } = bbox
  if (![y_min, x_min, y_max, x_max].every(n => Number.isFinite(n))) return false
  if (x_max <= x_min || y_max <= y_min) return false
  const area = (x_max - x_min) * (y_max - y_min)
  // Si el recuadro cubre más del 92% del área total, no aporta nada recortar.
  return area <= 1_000_000 * 0.92
}
