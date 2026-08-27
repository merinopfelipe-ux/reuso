// Config de DOMPurify compartida entre el editor (cliente), las rutas API
// que insertan notas (server) y el render de notas ya guardadas (cliente).
// Solo etiquetas de formato de texto — nada estructural, ningún atributo
// distinto a "style" (y DOMPurify limpia el CSS peligroso de ahí mismo).
export const NOTA_SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['a', 'b', 'strong', 'i', 'em', 'u', 's', 'del', 'strike', 'span', 'mark', 'br'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
}

// Para los textos legales de la cotización pública (crm_cotizaciones.legales_json):
// admite enlaces además del formato básico — vienen de renderLegalTexto()
// (src/lib/cotizador/legales.ts), que ya restringe href a rutas propias o
// https antes de llegar aquí.
export const LEGAL_SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['a', 'b', 'strong', 'i', 'em', 'u', 's', 'del', 'strike'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
}
