// Sintaxis Markdown simple compartida para campos de texto libre sin editor enriquecido
// (Recogemos y entregamos gratis, Mensajes destacados, Por qué elegirnos, Legales, etc.).
// - Enlaces: [texto](https://url) o [texto](/ruta)
// - Negrita: **texto** o *texto*
// - Cursiva: _texto_
// - Tachado: ~~texto~~ o ~texto~
export function renderTextoSimple(texto: string): string {
  if (!texto) return ''
  return texto
    // Enlaces: [texto](url)
    .replace(
      /\[([^\]]+)\]\((\/[^)\s]*|https:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline">$1</a>'
    )
    // Negrita: **texto** o *texto*
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    // Cursiva: _texto_
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    // Tachado: ~~texto~~ o ~texto~
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/~([^~]+)~/g, '<del>$1</del>')
}

// Agrega un punto final si el texto no termina ya en uno.
export function conPuntoFinal(texto: string): string {
  const t = texto.trim()
  return t.endsWith('.') ? t : `${t}.`
}
