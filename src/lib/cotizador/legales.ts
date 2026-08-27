// Texto legal por defecto de la cotización pública — se muestra mientras
// legales_json esté vacío, y es el primer renglón editable la primera vez
// que el vendedor abre "Legales" en el editor. Enlaza a los Términos y
// Condiciones de lurdes.co (página externa, no de este proyecto).
export const LEGAL_TEXTO_DEFECTO =
  'Al aceptar nuestra cotización, aceptas nuestros [términos y condiciones](https://lurdes.co/tyc/), así como los [parámetros de garantía](https://lurdes.co/tyc/#garantia).'

import { renderTextoSimple } from './texto-simple'

// Sintaxis simple [texto](url) → <a>, sin editor de texto enriquecido: la
// url solo admite rutas propias (/algo) o https, así que nunca abre la
// puerta a esquemas peligrosos (javascript:, data:, etc.) antes de que
// LEGAL_SANITIZE_CONFIG vuelva a sanear el HTML resultante.
export function renderLegalTexto(texto: string): string {
  if (!texto) return ''
  const htmlConLinks = texto.replace(
    /\[([^\]]+)\]\((\/[^)\s]*|https:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline">$1</a>'
  )
  return renderTextoSimple(htmlConLinks)
}
