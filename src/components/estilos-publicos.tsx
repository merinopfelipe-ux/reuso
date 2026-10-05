'use client'

import { ESTILOS_PUBLICOS } from '@/app/estilos-publicos.generated'

// CSS de las páginas públicas en línea, una sola vez en el HTML. Es componente
// de cliente a propósito: así el texto del CSS no se repite en los datos de
// React (como pasaba con inlineCss) y no hay hoja externa que bloquee el
// primer pintado. Se genera con scripts/generar-css-publico.mjs.
export function EstilosPublicos() {
  return <style dangerouslySetInnerHTML={{ __html: ESTILOS_PUBLICOS }} />
}
