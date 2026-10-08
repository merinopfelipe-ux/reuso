'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  KEY_ENTER_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  type ElementFormatType,
  type LexicalEditor,
} from 'lexical'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { AutoLinkPlugin, createLinkMatcherWithRegExp } from '@lexical/react/LexicalAutoLinkPlugin'
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin'
import { HorizontalRuleNode, INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { TRANSFORMERS } from '@lexical/markdown'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import {
  ListNode,
  ListItemNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
} from '@lexical/list'
import {
  LinkNode,
  AutoLinkNode,
  TOGGLE_LINK_COMMAND,
  $isLinkNode,
} from '@lexical/link'
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
} from '@lexical/selection'
import {
  $generateHtmlFromNodes,
  $generateNodesFromDOM,
} from '@lexical/html'

import {
  Highlighter, SmilePlus, Bold, Italic, Underline, Undo2, Redo2,
  ALargeSmall, CaseSensitive, ChevronDown as CaretDown,
  List, ListOrdered, Link as LinkIcon, Unlink,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Strikethrough, Minus, Maximize2, Minimize2, Check, X,
} from '@/components/ui/icons'

// Paleta acotada a los tokens de marca del sistema de diseño (nunca colores
// sueltos inventados). El primero es el resaltado por defecto, un amarillo
// claro tipo marcador.
export const COLORES_RESALTADO = [
  { nombre: 'Amarillo', valor: '#FBEEB8' },
  { nombre: 'Naranja', valor: '#FBDCB4' },
  { nombre: 'Rosa', valor: '#F3BBD3' },
  { nombre: 'Pistacho', valor: '#D6F391' },
  { nombre: 'Azul', valor: '#BFE3FA' },
  { nombre: 'Ninguno', valor: 'transparent' },
]

export const CATEGORIAS_EMOJI = [
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

const CASOS: Array<(texto: string) => string> = [
  texto => texto.toUpperCase(),
  texto => texto.toLowerCase(),
  texto => texto.replace(new RegExp('\\p{L}+', 'gu'), w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
]

function detectarCaso(texto: string): number {
  const letras = texto.replace(new RegExp('[^\\p{L}]', 'gu'), '')
  if (!letras) return -1
  if (letras === letras.toUpperCase() && letras !== letras.toLowerCase()) return 0
  if (letras === letras.toLowerCase() && letras !== letras.toUpperCase()) return 1
  const palabras = texto.match(new RegExp('\\p{L}+', 'gu')) ?? []
  const esTitulo = palabras.every(p => p === p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
  return esTitulo ? 2 : -1
}

const URL_REGEX = /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/
const EMAIL_REGEX = /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/

const AUTO_LINK_MATCHERS = [
  createLinkMatcherWithRegExp(URL_REGEX, text => (text.startsWith('http') ? text : `https://${text}`)),
  createLinkMatcherWithRegExp(EMAIL_REGEX, text => `mailto:${text}`),
]

export interface WYSIWYGHandle {
  getHTML: () => string
  isEmpty: () => boolean
  clear: () => void
  focus: () => void
}

export interface WYSIWYGProps {
  placeholder?: string
  /** Enter sin Shift dispara esto (Shift+Enter sigue insertando salto de línea). Omitir si no aplica. */
  onEnviar?: () => void
  minHeightPx?: number
  maxHeightPx?: number
  className?: string
  /** Contenido extra dentro del mismo recuadro, debajo del editor (ej. un botón "Enviar"). */
  footer?: React.ReactNode
  /** HTML inicial para editar un campo ya existente. Se aplica al montar. */
  initialHTML?: string
}

const lexicalTheme = {
  paragraph: 'mb-2 last:mb-0 leading-relaxed',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
  },
  list: {
    ul: 'list-disc pl-5 my-2 space-y-1',
    ol: 'list-decimal pl-5 my-2 space-y-1',
    listitem: 'leading-relaxed',
    nested: {
      listitem: 'list-none',
    },
  },
  link: 'text-brand underline hover:opacity-80 transition-opacity cursor-pointer font-medium',
  hr: 'my-3 border-t border-(--border)',
  quote: 'border-l-4 border-brand/40 pl-3 my-2 text-(--text-secondary) italic',
  heading: {
    h1: 'text-xl font-bold mb-2 text-(--text-primary)',
    h2: 'text-lg font-bold mb-1.5 text-(--text-primary)',
    h3: 'text-base font-semibold mb-1 text-(--text-primary)',
  },
}

function BotonToolbar({
  icon,
  label,
  atajo,
  onClick,
  disabled,
  active,
}: {
  icon: React.ReactNode
  label: string
  atajo?: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <div className="relative group/tt">
      <button
        type="button"
        onMouseDown={e => e.preventDefault()}
        onClick={onClick}
        disabled={disabled}
        className={`rte-btn inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
          active
            ? 'bg-brand/15 text-brand font-bold'
            : 'hover:bg-(--bg-hover) text-(--text-secondary)'
        }`}
      >
        {icon}
      </button>
      <span className="rte-tooltip pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-30 whitespace-nowrap opacity-0 scale-95 group-hover/tt:opacity-100 group-hover/tt:scale-100">
        {label}{atajo && <span className="rte-tooltip-atajo ml-1.5">{atajo}</span>}
      </span>
    </div>
  )
}

function SeparadorToolbar() {
  return <div className="w-[1px] h-4 bg-(--border) mx-0.5 shrink-0 self-center" />
}

// ── Controladores Internos de Lexical ──────────────────────────────────────────

function ImperativeBridgePlugin({
  onReady,
}: {
  onReady: (editor: LexicalEditor) => void
}) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    onReady(editor)
  }, [editor, onReady])
  return null
}

function InitialHTMLPlugin({ initialHTML }: { initialHTML?: string }) {
  const [editor] = useLexicalComposerContext()
  const montadoRef = useRef(false)

  useEffect(() => {
    if (!initialHTML || montadoRef.current) return
    montadoRef.current = true
    editor.update(() => {
      try {
        const parser = new DOMParser()
        const dom = parser.parseFromString(initialHTML, 'text/html')
        const nodes = $generateNodesFromDOM(editor, dom)
        const root = $getRoot()
        root.clear()
        root.append(...nodes)
      } catch (err) {
        console.error('Error al inicializar HTML en Lexical:', err)
      }
    }, { discrete: true })
  }, [editor, initialHTML])

  return null
}

function EnterSubmitPlugin({ onEnviar }: { onEnviar?: () => void }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    if (!onEnviar) return
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      event => {
        if (event && !event.shiftKey) {
          event.preventDefault()
          onEnviar()
          return true
        }
        return false
      },
      COMMAND_PRIORITY_HIGH
    )
  }, [editor, onEnviar])
  return null
}

// ── Barra Flotante Contextual (Notion / Medium Style) ──────────────────────────

function BarraFlotantePlugin({
  colorActual,
  onAbrirLink,
}: {
  colorActual: string
  onAbrirLink: () => void
}) {
  const [editor] = useLexicalComposerContext()
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrike, setIsStrike] = useState(false)

  const actualizarPosicion = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection) || selection.isCollapsed() || selection.getTextContent().length === 0) {
        setPos(null)
        return
      }

      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsStrike(selection.hasFormat('strikethrough'))

      const nativeSel = window.getSelection()
      if (!nativeSel || nativeSel.rangeCount === 0) {
        setPos(null)
        return
      }

      const domRange = nativeSel.getRangeAt(0)
      const rect = domRange.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) {
        setPos(null)
        return
      }

      setPos({
        top: Math.max(10, rect.top - 46),
        left: rect.left + rect.width / 2,
      })
    })
  }, [editor])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        actualizarPosicion()
        return false
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, actualizarPosicion])

  useEffect(() => {
    function onDocSelectionChange() {
      actualizarPosicion()
    }
    document.addEventListener('selectionchange', onDocSelectionChange)
    return () => document.removeEventListener('selectionchange', onDocSelectionChange)
  }, [actualizarPosicion])

  if (!pos) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        transform: 'translateX(-50%)',
        zIndex: 90,
      }}
      className="flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-(--bg-card) border border-(--border) shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      onMouseDown={e => e.preventDefault()}
    >
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors ${
          isBold ? 'bg-brand/15 text-brand font-bold' : 'hover:bg-(--bg-hover) text-(--text-secondary)'
        }`}
        title="Negrita (⌘B)"
      >
        <Bold size={13} />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors ${
          isItalic ? 'bg-brand/15 text-brand font-bold' : 'hover:bg-(--bg-hover) text-(--text-secondary)'
        }`}
        title="Cursiva (⌘I)"
      >
        <Italic size={13} />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors ${
          isUnderline ? 'bg-brand/15 text-brand font-bold' : 'hover:bg-(--bg-hover) text-(--text-secondary)'
        }`}
        title="Subrayado (⌘U)"
      >
        <Underline size={13} />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
        className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors ${
          isStrike ? 'bg-brand/15 text-brand font-bold' : 'hover:bg-(--bg-hover) text-(--text-secondary)'
        }`}
        title="Tachado"
      >
        <Strikethrough size={13} />
      </button>
      <div className="w-[1px] h-3.5 bg-(--border) mx-0.5" />
      <button
        type="button"
        onClick={() => {
          editor.update(() => {
            const sel = $getSelection()
            if ($isRangeSelection(sel)) {
              if (colorActual === 'transparent') {
                $patchStyleText(sel, { 'background-color': null, 'color': null })
              } else {
                $patchStyleText(sel, { 'background-color': colorActual, 'color': '#474747' })
              }
            }
          })
        }}
        className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-(--bg-hover) text-(--text-secondary) transition-colors"
        title="Resaltar"
      >
        <span className="relative inline-flex flex-col items-center">
          <Highlighter size={13} />
          <span
            className="w-3 h-[2.5px] rounded-full mt-px"
            style={{ background: colorActual === 'transparent' ? 'transparent' : colorActual }}
          />
        </span>
      </button>
      <button
        type="button"
        onClick={onAbrirLink}
        className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-(--bg-hover) text-(--text-secondary) transition-colors"
        title="Enlace"
      >
        <LinkIcon size={13} />
      </button>
    </div>
  )
}

// ── Barra Superior Modular ────────────────────────────────────────────────────

function ToolbarCompleta({
  colorActual,
  setColorActual,
  onTogglePantallaCompleta,
  esPantallaCompleta,
  onAbrirLinkModal,
}: {
  colorActual: string
  setColorActual: (color: string) => void
  onTogglePantallaCompleta: () => void
  esPantallaCompleta: boolean
  onAbrirLinkModal: () => void
}) {
  const [editor] = useLexicalComposerContext()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrike, setIsStrike] = useState(false)
  const [isBulletList, setIsBulletList] = useState(false)
  const [isNumberedList, setIsNumberedList] = useState(false)
  const [isLink, setIsLink] = useState(false)
  const [alineacion, setAlineacion] = useState<ElementFormatType>('left')

  const [colorAbierto, setColorAbierto] = useState(false)
  const [emojiAbierto, setEmojiAbierto] = useState(false)
  const [categoriaEmojiActiva, setCategoriaEmojiActiva] = useState(0)

  const colorBtnRef = useRef<HTMLDivElement>(null)
  const emojiBtnRef = useRef<HTMLDivElement>(null)
  const emojiListaRef = useRef<HTMLDivElement>(null)
  const seccionesEmojiRef = useRef<(HTMLDivElement | null)[]>([])

  const actualizarEstados = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return

      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsStrike(selection.hasFormat('strikethrough'))

      // Detectar nodo de lista o link
      const node = selection.anchor.getNode()
      const parent = node.getParent()
      setIsLink($isLinkNode(parent) || $isLinkNode(node))

      const el = node.getKey() === 'root' ? node : node.getTopLevelElementOrThrow()
      if ($isListNode(el)) {
        setIsBulletList(el.getListType() === 'bullet')
        setIsNumberedList(el.getListType() === 'number')
      } else if (parent && $isListNode(parent)) {
        setIsBulletList(parent.getListType() === 'bullet')
        setIsNumberedList(parent.getListType() === 'number')
      } else {
        setIsBulletList(false)
        setIsNumberedList(false)
      }

      if ('getFormatType' in el && typeof el.getFormatType === 'function') {
        setAlineacion(el.getFormatType())
      }
    })
  }, [editor])

  useEffect(() => {
    return editor.registerCommand(
      CAN_UNDO_COMMAND,
      payload => {
        setCanUndo(payload)
        return false
      },
      COMMAND_PRIORITY_CRITICAL
    )
  }, [editor])

  useEffect(() => {
    return editor.registerCommand(
      CAN_REDO_COMMAND,
      payload => {
        setCanRedo(payload)
        return false
      },
      COMMAND_PRIORITY_CRITICAL
    )
  }, [editor])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        actualizarEstados()
      })
    })
  }, [editor, actualizarEstados])

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

  function crecerFuente() {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const actualStr = $getSelectionStyleValueForProperty(selection, 'font-size', '14px')
        const actual = parseFloat(actualStr) || 14
        const nuevo = actual + 2
        $patchStyleText(selection, { 'font-size': `${nuevo}px` })
      }
    })
  }

  function aplicarResaltado() {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        if (colorActual === 'transparent') {
          $patchStyleText(selection, { 'background-color': null, 'color': null })
        } else {
          $patchStyleText(selection, { 'background-color': colorActual, 'color': '#474747' })
        }
      }
    })
  }

  function elegirColorResaltado(color: string) {
    setColorActual(color)
    setColorAbierto(false)
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        if (color === 'transparent') {
          $patchStyleText(selection, { 'background-color': null, 'color': null })
        } else {
          $patchStyleText(selection, { 'background-color': color, 'color': '#474747' })
        }
      }
    })
  }

  function alternarCaso() {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const text = selection.getTextContent()
        if (text) {
          const actual = detectarCaso(text)
          const siguiente = actual === -1 ? 0 : (actual + 1) % CASOS.length
          selection.insertText(CASOS[siguiente](text))
        }
      }
    })
  }

  function elegirEmoji(emoji: string) {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        selection.insertText(emoji)
      } else {
        const root = $getRoot()
        const last = root.getLastChild()
        if (last && $isParagraphNode(last)) {
          last.append($createTextNode(emoji))
        } else {
          const p = $createParagraphNode()
          p.append($createTextNode(emoji))
          root.append(p)
        }
      }
    })
    setEmojiAbierto(false)
  }

  function toggleListas(tipo: 'bullet' | 'number') {
    if (tipo === 'bullet') {
      editor.dispatchCommand(isBulletList ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND, undefined)
    } else {
      editor.dispatchCommand(isNumberedList ? REMOVE_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined)
    }
  }

  const ts = 'text-(--text-secondary)'
  const popoverCard = 'absolute top-full left-0 mt-1 z-20 rounded-xl border border-(--border) bg-(--bg-card) shadow-lg'

  return (
    <div className="flex overflow-x-auto items-center gap-1 px-1.5 py-1 border-b border-(--border) rounded-t-[11px] bg-(--bg-card) scrollbar-none"
      style={{ scrollbarWidth: 'none' }}>
      {/* ── Grupo 1: Historial ── */}
      <BotonToolbar
        icon={<Undo2 size={15} />}
        label="Deshacer"
        atajo="⌘Z"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        disabled={!canUndo}
      />
      <BotonToolbar
        icon={<Redo2 size={15} />}
        label="Rehacer"
        atajo="⌘⇧Z"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        disabled={!canRedo}
      />

      <SeparadorToolbar />

      {/* ── Grupo 2: Formato de Texto Inline ── */}
      <BotonToolbar
        icon={<Bold size={14} />}
        label="Negrita"
        atajo="⌘B"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        active={isBold}
      />
      <BotonToolbar
        icon={<Italic size={14} />}
        label="Cursiva"
        atajo="⌘I"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        active={isItalic}
      />
      <BotonToolbar
        icon={<Underline size={14} />}
        label="Subrayado"
        atajo="⌘U"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        active={isUnderline}
      />
      <BotonToolbar
        icon={<Strikethrough size={14} />}
        label="Tachado"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
        active={isStrike}
      />

      <SeparadorToolbar />

      {/* ── Grupo 3: Tamaño, Resaltado y Capitalización ── */}
      <BotonToolbar
        icon={<ALargeSmall size={15} />}
        label="Aumentar tamaño (+2px)"
        onClick={crecerFuente}
      />

      {/* Resaltado con paleta canónica del sistema */}
      <div ref={colorBtnRef} className="relative flex items-center group/tt">
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={aplicarResaltado}
          className="rte-btn inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-(--bg-hover) transition-colors cursor-pointer shrink-0"
        >
          <span className="relative inline-flex flex-col items-center">
            <Highlighter size={15} className={ts} />
            <span
              className="w-3.5 h-[3px] rounded-full mt-px"
              style={{ background: colorActual === 'transparent' ? 'transparent' : colorActual }}
            />
          </span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => {
            setColorAbierto(v => !v)
            setEmojiAbierto(false)
          }}
          className="inline-flex items-center justify-center w-4 h-7 rounded-lg hover:bg-(--bg-hover) transition-colors cursor-pointer shrink-0"
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
                className="w-7 h-7 rounded-lg border border-(--border) cursor-pointer flex items-center justify-center hover:scale-110 transition-transform"
                style={{
                  background:
                    c.valor === 'transparent'
                      ? 'repeating-conic-gradient(rgba(71,71,71,0.2) 0% 25%, transparent 0% 50%) 50% / 8px 8px'
                      : c.valor,
                }}
              >
                {colorActual === c.valor && <span className="w-1.5 h-1.5 rounded-full bg-(--text-primary)" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <BotonToolbar
        icon={<CaseSensitive size={16} />}
        label="Mayúsculas / minúsculas / Título"
        onClick={alternarCaso}
      />

      <SeparadorToolbar />

      {/* ── Grupo 4: Listas, Enlaces y Divisores ── */}
      <BotonToolbar
        icon={<List size={15} />}
        label="Lista con viñetas"
        onClick={() => toggleListas('bullet')}
        active={isBulletList}
      />
      <BotonToolbar
        icon={<ListOrdered size={15} />}
        label="Lista numerada"
        onClick={() => toggleListas('number')}
        active={isNumberedList}
      />
      <BotonToolbar
        icon={<LinkIcon size={14} />}
        label={isLink ? 'Editar enlace' : 'Insertar enlace'}
        onClick={onAbrirLinkModal}
        active={isLink}
      />
      <BotonToolbar
        icon={<Minus size={15} />}
        label="Línea divisoria"
        onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}
      />

      <SeparadorToolbar />

      {/* ── Grupo 5: Alineación ── */}
      <BotonToolbar
        icon={<AlignLeft size={14} />}
        label="Alinear a la izquierda"
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}
        active={alineacion === 'left'}
      />
      <BotonToolbar
        icon={<AlignCenter size={14} />}
        label="Centrar texto"
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}
        active={alineacion === 'center'}
      />
      <BotonToolbar
        icon={<AlignRight size={14} />}
        label="Alinear a la derecha"
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}
        active={alineacion === 'right'}
      />
      <BotonToolbar
        icon={<AlignJustify size={14} />}
        label="Justificar texto"
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')}
        active={alineacion === 'justify'}
      />

      <SeparadorToolbar />

      {/* ── Grupo 6: Emojis ── */}
      <div ref={emojiBtnRef} className="relative">
        <BotonToolbar
          icon={<SmilePlus size={15} />}
          label="Insertar emoji"
          onClick={() => {
            setEmojiAbierto(v => !v)
            setColorAbierto(false)
          }}
        />
        {emojiAbierto && (
          <div className={`${popoverCard} w-[296px]`}>
            {/* Pestañas de categoría */}
            <div className="flex items-center gap-0.5 p-1.5 border-b border-(--border) overflow-x-auto">
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
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base cursor-pointer transition-colors ${
                    categoriaEmojiActiva === i ? 'bg-(--bg-hover)' : 'hover:bg-(--bg-hover)'
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
                        className="text-xl leading-none w-9 h-9 flex items-center justify-center rounded-lg hover:bg-(--bg-hover) cursor-pointer transition-colors"
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

      <div className="flex-1" />

      {/* ── Grupo 7: Pantalla Completa / Enfoque ── */}
      <BotonToolbar
        icon={esPantallaCompleta ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        label={esPantallaCompleta ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa / Modo enfoque'}
        onClick={onTogglePantallaCompleta}
        active={esPantallaCompleta}
      />
    </div>
  )
}

// ── Diálogo de Enlace (Link Popover) ───────────────────────────────────────────

function ModalEnlace({
  abierto,
  urlInicial,
  onGuardar,
  onQuitar,
  onCerrar,
}: {
  abierto: boolean
  urlInicial: string
  onGuardar: (url: string) => void
  onQuitar: () => void
  onCerrar: () => void
}) {
  const [url, setUrl] = useState(urlInicial)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setUrl(urlInicial)
    if (abierto) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [abierto, urlInicial])

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#474747]/30 backdrop-blur-2xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm rounded-2xl bg-(--bg-card) border border-(--border) p-4 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-(--text-primary)">
            {urlInicial ? 'Editar enlace' : 'Insertar enlace'}
          </span>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1 rounded-lg text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault()
            if (url.trim()) onGuardar(url.trim())
          }}
          className="flex flex-col gap-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://ejemplo.com o correo@ejemplo.com"
            className="w-full px-3 py-2 text-sm rounded-xl border border-(--border) bg-(--bg-input) text-(--text-primary) outline-hidden focus:border-brand"
          />

          <div className="flex items-center justify-between gap-2 pt-1">
            {urlInicial ? (
              <button
                type="button"
                onClick={onQuitar}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-error hover:bg-error/10 transition-colors"
              >
                <Unlink size={13} /> Quitar enlace
              </button>
            ) : <span />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCerrar}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg text-(--text-secondary) hover:bg-(--bg-hover) transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!url.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-brand text-(--text-on-brand) hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Check size={13} /> Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Componente Principal WYSIWYG (Lexical) ──────────────────────────────

export const WYSIWYG = forwardRef<WYSIWYGHandle, WYSIWYGProps>(
  function WYSIWYG(
    {
      placeholder = 'Escribe aquí...',
      onEnviar,
      minHeightPx = 44,
      maxHeightPx = 160,
      className = '',
      footer,
      initialHTML,
    },
    ref
  ) {
    const editorInstanceRef = useRef<LexicalEditor | null>(null)
    const [colorActual, setColorActual] = useState(COLORES_RESALTADO[0].valor)
    const [esPantallaCompleta, setEsPantallaCompleta] = useState(false)
    const [contador, setContador] = useState({ palabras: 0, caracteres: 0 })
    const [linkModalAbierto, setLinkModalAbierto] = useState(false)
    const [urlLinkActual, setUrlLinkActual] = useState('')

    // Manejador imperativo compatible con el código existente
    useImperativeHandle(ref, () => ({
      getHTML: () => {
        const editor = editorInstanceRef.current
        if (!editor) return ''
        let html = ''
        editor.getEditorState().read(() => {
          html = $generateHtmlFromNodes(editor, null)
        })
        return html
      },
      isEmpty: () => {
        const editor = editorInstanceRef.current
        if (!editor) return true
        let vacio = true
        editor.getEditorState().read(() => {
          vacio = $getRoot().getTextContent().trim().length === 0
        })
        return vacio
      },
      clear: () => {
        const editor = editorInstanceRef.current
        if (!editor) return
        editor.update(
          () => {
            const root = $getRoot()
            root.clear()
            root.append($createParagraphNode())
          },
          { discrete: true }
        )
      },
      focus: () => {
        editorInstanceRef.current?.focus()
      },
    }))

    // Cerrar pantalla completa con ESC
    useEffect(() => {
      if (!esPantallaCompleta) return
      function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') setEsPantallaCompleta(false)
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [esPantallaCompleta])

    function handleAbrirLinkModal() {
      const editor = editorInstanceRef.current
      if (!editor) return
      editor.getEditorState().read(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const node = selection.anchor.getNode()
          const parent = node.getParent()
          if ($isLinkNode(parent)) {
            setUrlLinkActual(parent.getURL())
          } else if ($isLinkNode(node)) {
            setUrlLinkActual(node.getURL())
          } else {
            setUrlLinkActual('')
          }
        }
      })
      setLinkModalAbierto(true)
    }

    function handleGuardarLink(url: string) {
      const editor = editorInstanceRef.current
      if (!editor) return
      const finalUrl =
        url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')
          ? url
          : `https://${url}`
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, finalUrl)
      setLinkModalAbierto(false)
    }

    function handleQuitarLink() {
      const editor = editorInstanceRef.current
      if (!editor) return
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
      setLinkModalAbierto(false)
    }

    const initialConfig = {
      namespace: 'ReusoWYSIWYG',
      theme: lexicalTheme,
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
        AutoLinkNode,
        HorizontalRuleNode,
      ],
      onError: (error: Error) => {
        console.error('Lexical Error:', error)
      },
    }

    const contenedorClases = esPantallaCompleta
      ? 'fixed inset-0 z-[100] bg-[#474747]/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200'
      : `rounded-xl border overflow-hidden bg-(--bg-input) transition-colors border-(--border) focus-within:border-brand ${className}`

    const editorCardClases = esPantallaCompleta
      ? 'w-full max-w-4xl h-full max-h-[85vh] flex flex-col rounded-2xl bg-(--bg-input) border border-(--border) shadow-2xl overflow-hidden'
      : 'flex flex-col'

    const editorContentEstilo = {
      minHeight: esPantallaCompleta ? 280 : minHeightPx,
      maxHeight: esPantallaCompleta ? 'none' : maxHeightPx,
      // La tipografía del sistema de diseño se preserva estrictamente sin admitir otras fuentes
      fontFamily: "'Open Sans', sans-serif",
    }

    return (
      <div className={contenedorClases}>
        <div className={editorCardClases}>
          <LexicalComposer initialConfig={initialConfig}>
            <ImperativeBridgePlugin onReady={ed => { editorInstanceRef.current = ed }} />
            <InitialHTMLPlugin initialHTML={initialHTML} />
            <EnterSubmitPlugin onEnviar={onEnviar} />

            {/* Barra de herramientas principal */}
            <ToolbarCompleta
              colorActual={colorActual}
              setColorActual={setColorActual}
              esPantallaCompleta={esPantallaCompleta}
              onTogglePantallaCompleta={() => setEsPantallaCompleta(v => !v)}
              onAbrirLinkModal={handleAbrirLinkModal}
            />

            {/* Barra flotante para selecciones rápidas estilo Notion */}
            <BarraFlotantePlugin
              colorActual={colorActual}
              onAbrirLink={handleAbrirLinkModal}
            />

            {/* Contenido editable */}
            <div className="relative flex-1 flex flex-col">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    style={editorContentEstilo}
                    className="overflow-y-auto px-3 py-2.5 text-sm leading-relaxed outline-hidden text-(--text-primary) flex-1"
                  />
                }
                placeholder={
                  <div className="pointer-events-none select-none absolute left-3 top-2.5 text-sm text-(--text-secondary)">
                    {placeholder}
                  </div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
              <HistoryPlugin />
              <ListPlugin />
              <LinkPlugin />
              <AutoLinkPlugin matchers={AUTO_LINK_MATCHERS} />
              <HorizontalRulePlugin />
              <MarkdownShortcutPlugin transformers={TRANSFORMERS} />

              {/* Listener de conteo de palabras y caracteres */}
              <EditorContadorPlugin onUpdate={setContador} />
            </div>

            {/* Barra inferior: Contador dinámico y footer opcional */}
            <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-t border-(--border)/60 text-[11px] text-(--text-placeholder) select-none">
              <div className="flex-1">
                {footer}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span>{contador.palabras} {contador.palabras === 1 ? 'palabra' : 'palabras'}</span>
                <span>·</span>
                <span>{contador.caracteres} {contador.caracteres === 1 ? 'carácter' : 'caracteres'}</span>
              </div>
            </div>
          </LexicalComposer>
        </div>

        {/* Modal para configurar/editar enlaces */}
        <ModalEnlace
          abierto={linkModalAbierto}
          urlInicial={urlLinkActual}
          onGuardar={handleGuardarLink}
          onQuitar={handleQuitarLink}
          onCerrar={() => setLinkModalAbierto(false)}
        />

        <style
          dangerouslySetInnerHTML={{
            __html: `
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
          `,
          }}
        />
      </div>
    )
  }
)

function EditorContadorPlugin({
  onUpdate,
}: {
  onUpdate: (val: { palabras: 0 | number; caracteres: number }) => void
}) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const text = $getRoot().getTextContent().trim()
        const caracteres = text.length
        const palabras = text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length
        onUpdate({ palabras, caracteres })
      })
    })
  }, [editor, onUpdate])
  return null
}
