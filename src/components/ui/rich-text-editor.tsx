'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  Highlighter, SmilePlus, Bold, Italic, Underline, Undo2, Redo2,
  ALargeSmall, CaseSensitive, ChevronDown as CaretDown,
} from '@/components/ui/icons'

const HISTORY_LIMIT = 50
const HISTORY_DEBOUNCE_MS = 400
const TAMANO_BASE_PX = 14
const TAMANO_PASO_PX = 2

// Paleta acotada a los tokens de marca del sistema de diseño (nunca colores
// sueltos inventados). El primero es el resaltado por defecto, un amarillo
// claro tipo marcador — un clic directo en el ícono aplica siempre el
// último color elegido.
// Progresión tipo arcoíris (cálido → frío), todos tonos pálidos de la
// misma familia de luminosidad que el amarillo pedido explícitamente
// (#FBEEB8) — sin menta, ya cubierta por el verde de pistacho.
const COLORES_RESALTADO = [
  { nombre: 'Amarillo', valor: '#FBEEB8' },
  { nombre: 'Naranja', valor: '#FBDCB4' },
  { nombre: 'Rosa', valor: '#F3BBD3' },
  { nombre: 'Pistacho', valor: '#D6F391' },
  { nombre: 'Azul', valor: '#BFE3FA' },
  { nombre: 'Ninguno', valor: 'transparent' },
]

// Agrupados por categoría (como el picker nativo de Mac/Slack) — la primera
// posición de cada `emojis` dobla como ícono de la pestaña de esa categoría.
const CATEGORIAS_EMOJI = [
  {
    nombre: 'Caritas',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤗', '🤔', '🤭', '🤫', '🤐', '😐', '😑', '😶', '🙄', '😏', '😮', '😴', '😌', '🥱', '😷', '🤒', '🤕', '🤢', '🥵', '🥶', '🥴', '😵', '🤯', '😳', '🥺', '😢', '😭', '😱', '😨', '😤', '😠', '😡', '🤬'],
  },
  {
    nombre: 'Gestos',
    emojis: ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🙏', '💪', '🫶', '🤝', '✍️'],
  },
  {
    nombre: 'Amor',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  },
  {
    nombre: 'Naturaleza',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🐺', '🐴', '🦄', '🐝', '🦋', '🐢', '🐍', '🐙', '🐠', '🐬', '🐳', '🌵', '🌲', '🌳', '🌴', '🌱', '🌸', '🌺', '🌻', '🌼', '🌷', '🌹', '🍀', '🍁', '🌊', '☀️', '⛅', '🌧️', '⛈️', '❄️', '🌈'],
  },
  {
    nombre: 'Comida',
    emojis: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍆', '🥦', '🌽', '🥕', '🥔', '🍞', '🥐', '🧀', '🥚', '🍳', '🥞', '🥓', '🍔', '🍟', '🍕', '🌭', '🌮', '🌯', '🥗', '🍿', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭', '🍦', '☕', '🍵', '🥤', '🍺', '🍷'],
  },
  {
    nombre: 'Actividades',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '⛳', '🏹', '🎣', '🥊', '🎽', '🏂', '🏄‍♂️', '🏊‍♀️', '🚴‍♂️', '🎯', '🎮', '🎲', '🧩', '🎨', '🎭', '🎤', '🎧', '🎸', '🎹', '🎬'],
  },
  {
    nombre: 'Objetos',
    emojis: ['💡', '🔋', '🔌', '📱', '💻', '⌚', '📷', '🎥', '📺', '⏰', '⏱️', '📅', '📌', '📎', '✂️', '📐', '📏', '🖊️', '📝', '📚', '💼', '👜', '💰', '💳', '💎', '🔑', '🔒', '🔓', '🔨', '🔧', '⚙️', '🔗', '🛋️', '🚚'],
  },
  {
    nombre: 'Símbolos',
    emojis: ['✅', '❌', '❓', '❗', '⭐', '🔥', '💯', '✨', '🎉', '🎊', '🎁', '🏆', '🥇', '🥈', '🥉', '🚗', '✈️', '🚀', '⛵', '🏠', '🏢', '🏥', '🏫', '🌍', '🗺️', '🧭'],
  },
]

// Alterna entre MAYÚSCULAS, minúsculas y Título en cada clic — \p{L} (no
// \w) para que reconozca correctamente tildes y ñ del español.
const CASOS: Array<(texto: string) => string> = [
  texto => texto.toUpperCase(),
  texto => texto.toLowerCase(),
  texto => texto.replace(new RegExp('\\p{L}+', 'gu'), w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
]

// Detecta en qué caso está el texto YA seleccionado — igual que negrita/
// cursiva/subrayado detectan su propio estado antes de decidir qué hacer,
// en vez de depender de un contador global que no sabe qué hay realmente
// seleccionado (eso hacía que alternar mayúsculas en una palabra y luego
// en otra distinta continuara el ciclo a medias, en vez de partir de cero).
function detectarCaso(texto: string): number {
  const letras = texto.replace(new RegExp('[^\\p{L}]', 'gu'), '')
  if (!letras) return -1
  if (letras === letras.toUpperCase() && letras !== letras.toLowerCase()) return 0
  if (letras === letras.toLowerCase() && letras !== letras.toUpperCase()) return 1
  const palabras = texto.match(new RegExp('\\p{L}+', 'gu')) ?? []
  const esTitulo = palabras.every(p => p === p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
  return esTitulo ? 2 : -1
}

// Coloca el cursor justo después de `nodo` para que se pueda seguir
// escribiendo de inmediato — sin esto, cualquier acción de formato "pierde"
// la selección y el usuario tiene que volver a hacer clic en el editor.
function colocarCursorDespuesDe(sel: Selection, nodo: Node) {
  const nuevoRango = document.createRange()
  nuevoRango.setStartAfter(nodo)
  nuevoRango.collapse(true)
  sel.removeAllRanges()
  sel.addRange(nuevoRango)
}

function colocarCursorAlFinal(el: HTMLElement) {
  const sel = window.getSelection()
  if (!sel) return
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
}

// Selección activa dentro de `el`, o null si no hay ninguna (nada
// seleccionado, o la selección vive fuera del editor).
function seleccionEnEditor(el: HTMLElement): { sel: Selection; range: Range } | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  if (!el.contains(range.commonAncestorContainer)) return null
  return { sel, range }
}

// Estilo computado del elemento donde empieza la selección — para saber si
// "ya está en negrita" antes de decidir si un clic la activa o la quita.
function estiloEnInicio(range: Range): CSSStyleDeclaration | null {
  let nodo: Node = range.startContainer
  if (nodo.nodeType === Node.TEXT_NODE) nodo = nodo.parentElement as Node
  return nodo instanceof Element ? getComputedStyle(nodo) : null
}

// Envuelve la selección activa dentro de `el` con un <span style="...">.
// Si la selección cruza varios nodos (ej. texto ya formateado),
// surroundContents falla — se extrae el contenido y se reinserta dentro
// del span, que sí soporta selecciones "irregulares".
function envolverSeleccion(el: HTMLElement, style: string): boolean {
  const activa = seleccionEnEditor(el)
  if (!activa) return false
  const { sel, range } = activa
  const span = document.createElement('span')
  span.setAttribute('style', style)
  try {
    range.surroundContents(span)
  } catch {
    const contenido = range.extractContents()
    span.appendChild(contenido)
    range.insertNode(span)
  }
  colocarCursorDespuesDe(sel, span)
  return true
}

// "Ninguno" en el resaltado NO se puede resolver anidando un span
// transparente encima (a diferencia de negrita/cursiva/subrayado):
// background-color no es una propiedad de texto heredable, es la pintura
// de la caja del elemento — un hijo transparente deja ver el fondo del
// padre de todos modos, nunca lo tapa. Por eso hay que buscar los spans de
// resaltado que toca la selección y quitarles el estilo de verdad.
function quitarResaltado(el: HTMLElement): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return false
  const range = sel.getRangeAt(0)
  if (!el.contains(range.commonAncestorContainer)) return false

  const spans = new Set<HTMLSpanElement>()

  function marcarSiResaltado(nodo: Node | null) {
    let actual: Node | null = nodo
    while (actual && actual !== el) {
      if (actual instanceof HTMLSpanElement && actual.style.backgroundColor && actual.style.backgroundColor !== 'transparent') {
        spans.add(actual)
      }
      actual = actual.parentNode
    }
  }
  marcarSiResaltado(range.startContainer)
  marcarSiResaltado(range.endContainer)
  el.querySelectorAll('span').forEach(s => {
    if (s.style.backgroundColor && s.style.backgroundColor !== 'transparent' && range.intersectsNode(s)) {
      spans.add(s)
    }
  })

  if (spans.size === 0) return false

  spans.forEach(span => {
    span.style.removeProperty('background-color')
    span.style.removeProperty('color')
    // Sin background-color quedó sin motivo para seguir existiendo — si no
    // le queda ningún estilo útil, se desenvuelve para no acumular spans
    // vacíos en el HTML guardado.
    if (!span.getAttribute('style')) {
      const padre = span.parentNode
      if (padre) {
        while (span.firstChild) padre.insertBefore(span.firstChild, span)
        padre.removeChild(span)
      }
    }
  })

  sel.removeAllRanges()
  return true
}

// Negrita/cursiva/subrayado son toggle: si la selección ya tiene el estilo
// activo, el mismo botón lo quita (envolviendo con el valor inverso, que
// gana por estar más anidado) en vez de solo poder prenderlo.
function alternarEstilo(el: HTMLElement, propiedad: string, activo: boolean, valorOn: string, valorOff: string): boolean {
  return envolverSeleccion(el, `${propiedad}:${activo ? valorOff : valorOn}`)
}

// A diferencia de envolverSeleccion, esto transforma el texto de verdad (no
// solo lo estiliza) — mayúsculas/minúsculas/título son acciones de
// contenido, no de forma, así que sobreviven a cualquier sanitización.
function transformarSeleccion(el: HTMLElement, transformar: (t: string) => string): boolean {
  const activa = seleccionEnEditor(el)
  if (!activa) return false
  const { sel, range } = activa
  const texto = range.toString()
  if (!texto) return false
  range.deleteContents()
  const nodo = document.createTextNode(transformar(texto))
  range.insertNode(nodo)
  colocarCursorDespuesDe(sel, nodo)
  return true
}

// Inserta texto (emoji) en la posición del cursor, reemplazando la
// selección si había una. Si no hay selección activa dentro de `el`, lo
// agrega al final — así el botón de emoji nunca falla silenciosamente.
function insertarEnCursor(el: HTMLElement, texto: string) {
  const sel = window.getSelection()
  const nodo = document.createTextNode(texto)
  if (sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    const range = sel.getRangeAt(0)
    range.deleteContents()
    range.insertNode(nodo)
    colocarCursorDespuesDe(sel, nodo)
  } else {
    el.appendChild(nodo)
  }
}

export interface RichTextEditorHandle {
  getHTML: () => string
  isEmpty: () => boolean
  clear: () => void
  focus: () => void
}

export interface RichTextEditorProps {
  placeholder?: string
  /** Enter sin Shift dispara esto (Shift+Enter sigue insertando salto de línea). Omitir si no aplica. */
  onEnviar?: () => void
  minHeightPx?: number
  maxHeightPx?: number
  className?: string
  /** Contenido extra dentro del mismo recuadro, debajo del editor (ej. un botón "Enviar"). */
  footer?: React.ReactNode
  /** HTML inicial para editar un campo ya existente (ej. notas públicas) —
   * a diferencia del uso normal como caja de "nota nueva" siempre vacía.
   * Se aplica una sola vez, al montar. */
  initialHTML?: string
}

// Botón de toolbar con tooltip propio (no el title nativo del navegador) —
// nombre de la acción + atajo de teclado si tiene, igual al patrón ya usado
// en la barra superior de la propuesta pública (.legal-tooltip).
function BotonToolbar({ icon, label, atajo, onClick, disabled }: {
  icon: React.ReactNode
  label: string
  atajo?: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <div className="relative group/tt">
      <button
        type="button"
        onMouseDown={e => e.preventDefault()}
        onClick={onClick}
        disabled={disabled}
        className="rte-btn inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        {icon}
      </button>
      <span className="rte-tooltip pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-30 whitespace-nowrap opacity-0 scale-95 group-hover/tt:opacity-100 group-hover/tt:scale-100">
        {label}{atajo && <span className="rte-tooltip-atajo ml-1.5">{atajo}</span>}
      </span>
    </div>
  )
}

/**
 * Editor WYSIWYG propio (sin librería externa), pensado para reutilizarse
 * en cualquier campo de texto enriquecido de la app: notas internas hoy, y
 * cualquier otro campo de texto libre mañana.
 *
 * Toolbar (de izquierda a derecha): deshacer/rehacer · negrita/cursiva/
 * subrayado (toggle, con atajo ⌘B/⌘I/⌘U) · aumentar tamaño de letra (solo
 * crece, de 2px en 2px, sin límite) · resaltado con selector de color ·
 * transformar texto (alterna MAYÚSCULAS → minúsculas → Título en cada
 * clic) · emojis.
 *
 * El deshacer/rehacer es un historial propio de snapshots de HTML (no
 * `document.execCommand('undo')`, deprecado e inconsistente entre
 * navegadores para mutaciones de DOM hechas por código, que es como
 * aplicamos todo el formato aquí).
 *
 * El HTML que produce SIEMPRE debe sanearse con DOMPurify (ver
 * `src/lib/sanitize-notas.ts`) tanto al guardar (server) como al mostrar
 * (cliente) — este componente no sanea nada por sí mismo, solo genera HTML.
 */
export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor(
  { placeholder = 'Escribe aquí...', onEnviar, minHeightPx = 44, maxHeightPx = 160, className = '', footer, initialHTML },
  ref
) {
  const [vacio, setVacio] = useState(true)
  const [enfocado, setEnfocado] = useState(false)
  const [colorAbierto, setColorAbierto] = useState(false)
  const [emojiAbierto, setEmojiAbierto] = useState(false)
  const [categoriaEmojiActiva, setCategoriaEmojiActiva] = useState(0)
  const [colorActual, setColorActual] = useState(COLORES_RESALTADO[0].valor)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const colorBtnRef = useRef<HTMLDivElement>(null)
  const emojiBtnRef = useRef<HTMLDivElement>(null)
  const emojiListaRef = useRef<HTMLDivElement>(null)
  const seccionesEmojiRef = useRef<(HTMLDivElement | null)[]>([])
  // Historial propio para deshacer/rehacer — snapshots de innerHTML.
  const historyRef = useRef<string[]>([''])
  const historyIdxRef = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function actualizarBanderasHistorial() {
    setCanUndo(historyIdxRef.current > 0)
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1)
  }

  function registrarHistorial() {
    const html = editorRef.current?.innerHTML ?? ''
    if (html === historyRef.current[historyIdxRef.current]) return
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1)
    historyRef.current.push(html)
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift()
    historyIdxRef.current = historyRef.current.length - 1
    actualizarBanderasHistorial()
  }

  function registrarHistorialConDebounce() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(registrarHistorial, HISTORY_DEBOUNCE_MS)
  }

  function restaurarSnapshot(idx: number) {
    const el = editorRef.current
    if (!el) return
    el.innerHTML = historyRef.current[idx]
    historyIdxRef.current = idx
    actualizarBanderasHistorial()
    setVacio(!el.textContent?.trim())
    el.focus()
    colocarCursorAlFinal(el)
  }

  function deshacer() {
    if (historyIdxRef.current <= 0) return
    if (debounceRef.current) { clearTimeout(debounceRef.current); registrarHistorial() }
    restaurarSnapshot(historyIdxRef.current - 1)
  }

  function rehacer() {
    if (historyIdxRef.current >= historyRef.current.length - 1) return
    restaurarSnapshot(historyIdxRef.current + 1)
  }

  // Aplica el HTML inicial una sola vez, al montar (no en cada render, para
  // no pisar lo que el usuario está escribiendo).
  useEffect(() => {
    if (!initialHTML || !editorRef.current) return
    editorRef.current.innerHTML = initialHTML
    setVacio(!editorRef.current.textContent?.trim())
    historyRef.current = [initialHTML]
    historyIdxRef.current = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    getHTML: () => editorRef.current?.innerHTML ?? '',
    isEmpty: () => !editorRef.current?.textContent?.trim(),
    clear: () => {
      if (editorRef.current) editorRef.current.innerHTML = ''
      setVacio(true)
      historyRef.current = ['']
      historyIdxRef.current = 0
      actualizarBanderasHistorial()
    },
    focus: () => editorRef.current?.focus(),
  }))

  // Un único listener para los popovers (color y emoji): cierra el que
  // esté abierto si el clic fue fuera de SU botón+panel. Cada botón+panel
  // vive en un mismo div de referencia, así que un clic sobre el propio
  // botón nunca cuenta como "afuera" — eso evita que abrir y cerrar con el
  // mismo botón se pisen entre el mousedown del documento y el click.
  useEffect(() => {
    if (!colorAbierto && !emojiAbierto) return
    function handleClickFuera(e: MouseEvent) {
      const target = e.target as Node
      if (colorAbierto && !colorBtnRef.current?.contains(target)) setColorAbierto(false)
      if (emojiAbierto && !emojiBtnRef.current?.contains(target)) setEmojiAbierto(false)
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [colorAbierto, emojiAbierto])

  function aplicarNegrita() {
    const el = editorRef.current
    const activa = el && seleccionEnEditor(el)
    if (!el || !activa) return
    const cs = estiloEnInicio(activa.range)
    const activo = cs ? parseInt(cs.fontWeight, 10) >= 700 : false
    if (alternarEstilo(el, 'font-weight', activo, '700', '400')) registrarHistorial()
  }

  function aplicarCursiva() {
    const el = editorRef.current
    const activa = el && seleccionEnEditor(el)
    if (!el || !activa) return
    const cs = estiloEnInicio(activa.range)
    const activo = cs?.fontStyle === 'italic'
    if (alternarEstilo(el, 'font-style', activo, 'italic', 'normal')) registrarHistorial()
  }

  function aplicarSubrayado() {
    const el = editorRef.current
    const activa = el && seleccionEnEditor(el)
    if (!el || !activa) return
    const cs = estiloEnInicio(activa.range)
    const activo = (cs?.textDecorationLine || cs?.textDecoration || '').includes('underline')
    if (alternarEstilo(el, 'text-decoration', activo, 'underline', 'none')) registrarHistorial()
  }

  // Solo crece — de 2px en 2px, sin límite superior. Parte de 14px (tamaño
  // base del editor) si el texto seleccionado nunca tuvo un tamaño propio.
  function crecerFuente() {
    const el = editorRef.current
    const activa = el && seleccionEnEditor(el)
    if (!el || !activa) return
    const cs = estiloEnInicio(activa.range)
    const actual = cs ? parseFloat(cs.fontSize) : TAMANO_BASE_PX
    const nuevo = (Number.isNaN(actual) ? TAMANO_BASE_PX : actual) + TAMANO_PASO_PX
    if (envolverSeleccion(el, `font-size:${nuevo}px`)) registrarHistorial()
  }

  function estiloResaltado(color: string) {
    // color:#474747 fijo — son fondos claros sólidos, si el texto hereda
    // blanco (modo noche) queda ilegible. Nunca texto blanco sobre fondo claro.
    return color === 'transparent'
      ? 'background-color:transparent'
      : `background-color:${color};color:#474747;border-radius:3px;padding:0 2px`
  }

  function aplicarResaltado() {
    const el = editorRef.current
    if (!el) return
    const ok = colorActual === 'transparent' ? quitarResaltado(el) : envolverSeleccion(el, estiloResaltado(colorActual))
    if (ok) registrarHistorial()
  }

  function elegirColorResaltado(color: string) {
    setColorActual(color)
    setColorAbierto(false)
    const el = editorRef.current
    if (!el) return
    const ok = color === 'transparent' ? quitarResaltado(el) : envolverSeleccion(el, estiloResaltado(color))
    if (ok) registrarHistorial()
  }

  function alternarCaso() {
    const el = editorRef.current
    const activa = el && seleccionEnEditor(el)
    if (!el || !activa) return
    const actual = detectarCaso(activa.range.toString())
    const siguiente = actual === -1 ? 0 : (actual + 1) % CASOS.length
    if (transformarSeleccion(el, CASOS[siguiente])) registrarHistorial()
  }

  function elegirEmoji(emoji: string) {
    const el = editorRef.current
    if (!el) return
    el.focus()
    insertarEnCursor(el, emoji)
    setVacio(!el.textContent?.trim())
    setEmojiAbierto(false)
    registrarHistorial()
  }

  function handleInput() {
    setVacio(!editorRef.current?.textContent?.trim())
    registrarHistorialConDebounce()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && !e.shiftKey && onEnviar) {
      e.preventDefault()
      onEnviar()
      return
    }
    const meta = e.metaKey || e.ctrlKey
    if (!meta) return
    const tecla = e.key.toLowerCase()
    if (tecla === 'z' && !e.shiftKey) { e.preventDefault(); deshacer(); return }
    if (tecla === 'y' || (tecla === 'z' && e.shiftKey)) { e.preventDefault(); rehacer(); return }
    if (tecla === 'b') { e.preventDefault(); aplicarNegrita(); return }
    if (tecla === 'i') { e.preventDefault(); aplicarCursiva(); return }
    if (tecla === 'u') { e.preventDefault(); aplicarSubrayado() }
  }

  const ts = 'text-[var(--text-secondary)]'
  const tp = 'text-[var(--text-primary)]'
  const popoverCard = 'absolute top-full left-0 mt-1 z-20 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-lg'

  return (
    <div
      className={`rounded-xl border overflow-hidden bg-[var(--bg-input)] transition-colors ${
        enfocado ? 'border-[var(--color-brand)]' : 'border-[var(--border)]'
      } ${className}`}
    >
      <div className="flex flex-wrap items-center gap-1 px-1.5 py-1 border-b border-[var(--border)] rounded-t-[11px]">
        <BotonToolbar icon={<Undo2 size={15} className={ts} />} label="Deshacer" atajo="⌘Z" onClick={deshacer} disabled={!canUndo} />
        <BotonToolbar icon={<Redo2 size={15} className={ts} />} label="Rehacer" atajo="⌘⇧Z" onClick={rehacer} disabled={!canRedo} />

        <div className="w-2 flex-shrink-0" />

        <BotonToolbar icon={<Bold size={14} className={ts} />} label="Negrita" atajo="⌘B" onClick={aplicarNegrita} />
        <BotonToolbar icon={<Italic size={14} className={ts} />} label="Cursiva" atajo="⌘I" onClick={aplicarCursiva} />
        <BotonToolbar icon={<Underline size={14} className={ts} />} label="Subrayado" atajo="⌘U" onClick={aplicarSubrayado} />

        <div className="w-2 flex-shrink-0" />

        <BotonToolbar icon={<ALargeSmall size={15} className={ts} />} label="Aumentar tamaño" onClick={crecerFuente} />

        {/* Resaltado: clic directo en el ícono aplica el último color usado; la flechita abre la paleta. */}
        <div ref={colorBtnRef} className="relative flex items-center group/tt">
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={aplicarResaltado} className="rte-btn inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer flex-shrink-0">
            <span className="relative inline-flex flex-col items-center">
              <Highlighter size={15} className={ts} />
              <span className="w-3.5 h-[3px] rounded-full mt-px" style={{ background: colorActual === 'transparent' ? 'transparent' : colorActual }} />
            </span>
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { setColorAbierto(v => !v); setEmojiAbierto(false) }}
            className="inline-flex items-center justify-center w-4 h-7 rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer flex-shrink-0"
            title="Elegir color de resaltado"
          >
            <CaretDown size={11} className={ts} />
          </button>
          <span className="rte-tooltip pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-30 whitespace-nowrap opacity-0 scale-95 group-hover/tt:opacity-100 group-hover/tt:scale-100">
            Resaltar
          </span>
          {colorAbierto && (
            <div className={`${popoverCard} p-2 grid grid-cols-3 gap-1.5 w-[132px]`}>
              {COLORES_RESALTADO.map(c => (
                <button
                  key={c.nombre}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => elegirColorResaltado(c.valor)}
                  title={c.nombre}
                  className="w-7 h-7 rounded-lg border border-[var(--border)] cursor-pointer flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ background: c.valor === 'transparent' ? 'repeating-conic-gradient(#ddd 0% 25%, transparent 0% 50%) 50% / 8px 8px' : c.valor }}
                >
                  {colorActual === c.valor && <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <BotonToolbar icon={<CaseSensitive size={16} className={ts} />} label="Mayúsculas / minúsculas / Título" onClick={alternarCaso} />

        <div ref={emojiBtnRef} className="relative">
          <BotonToolbar
            icon={<SmilePlus size={15} className={ts} />}
            label="Insertar emoji"
            onClick={() => { setEmojiAbierto(v => !v); setColorAbierto(false) }}
          />
          {emojiAbierto && (
            <div className={`${popoverCard} w-[296px]`}>
              {/* Pestañas de categoría — saltan a esa sección de la lista de abajo */}
              <div className="flex items-center gap-0.5 p-1.5 border-b border-[var(--border)] overflow-x-auto">
                {CATEGORIAS_EMOJI.map((cat, i) => (
                  <button
                    key={cat.nombre}
                    type="button"
                    title={cat.nombre}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setCategoriaEmojiActiva(i)
                      seccionesEmojiRef.current[i]?.scrollIntoView({ block: 'start', behavior: 'smooth' })
                    }}
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base cursor-pointer transition-colors ${
                      categoriaEmojiActiva === i ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {cat.emojis[0]}
                  </button>
                ))}
              </div>

              <div ref={emojiListaRef} className="max-h-[260px] overflow-y-auto p-2">
                {CATEGORIAS_EMOJI.map((cat, i) => (
                  <div key={cat.nombre} ref={n => { seccionesEmojiRef.current[i] = n }} className={i > 0 ? 'mt-3' : ''}>
                    <p className={`text-[11px] font-semibold mb-1.5 px-0.5 ${ts}`}>{cat.nombre}</p>
                    <div className="grid grid-cols-7 gap-1">
                      {cat.emojis.map((emoji, j) => (
                        <button
                          key={`${cat.nombre}-${j}`}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => elegirEmoji(emoji)}
                          className="text-xl leading-none w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        {vacio && (
          <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none ${ts}`}>
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          style={{ minHeight: minHeightPx, maxHeight: maxHeightPx }}
          className={`overflow-y-auto px-3 py-2.5 text-sm leading-relaxed outline-none ${tp}`}
        />
      </div>

      {footer && <div className="rounded-b-[11px]">{footer}</div>}

      <style dangerouslySetInnerHTML={{ __html: `
        .rte-tooltip {
          background: #2a2a2a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 9px;
          border-radius: 8px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.18);
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .rte-tooltip-atajo { opacity: 0.55; font-weight: 500; }
        [data-theme="dark"] .rte-tooltip {
          background: #f0f0f0;
          color: #2a2a2a;
          box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        }
      ` }} />
    </div>
  )
})
