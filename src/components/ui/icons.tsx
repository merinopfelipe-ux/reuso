'use client'

import React, { useEffect, useRef } from 'react'
import * as Lucide from 'lucide-react'
import * as LucideAnimated from '@animateicons/react/lucide'

// IconProps extends standard SVG props + custom size, color, strokeWidth, and duotone
export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'size'> {
  size?: number | string
  color?: string
  strokeWidth?: number | string
  duotone?: boolean
  // Desactiva el ícono animado externo Y el fallback de zoom
  // (group-hover:scale-110) que wrapIcon agrega por defecto a TODO ícono —
  // necesario en contextos donde el sistema de diseño pide cero animación
  // (tablas: encabezados, checkboxes, menús "⋮"), directriz explícita del
  // usuario 2026-08-17, porque antes ningún className propio podía
  // sobreescribirlo (se combinaban, no se reemplazaban).
  sinAnimacion?: boolean
}

export type Icon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>

// @animateicons/react/lucide (la librería de lucide-animated.com) está rota
// en este proyecto: confirmado con depuración en vivo (2026-08-20) que su
// motor interno de animación (framer-motion embebido, minificado, con
// LazyMotion desde la 0.3.3) nunca produce un cambio visual real, aunque
// nuestro startAnimation()/stopAnimation() se invoque correctamente en el
// momento correcto (verificado con getComputedStyle — el transform nunca
// cambia de 'none'). Descartado: (a) prefers-reduced-motion del sistema
// (confirmado desactivado en la prueba), (b) nuestra integración (ref,
// .group, listeners — el ref sí queda poblado y sí se llama
// startAnimation() en el momento correcto), (c) la versión instalada —
// se probó actualizando de 0.3.4 a la última publicada (0.4.3) y el bug
// persiste idéntico. Es un problema interno del paquete en este entorno de
// build (Next.js 14 + Turbopack/webpack), no algo que una reinstalación o
// actualización resuelva. Mientras no se corrija upstream, todo ícono usa
// el fallback de zoom estándar del sistema — es exactamente la regla ya
// definida ("lucide-animated si existe, si no, zoom in"): si la librería
// no funciona, cae al "si no" de la misma regla, nunca queda sin animación.
const LUCIDE_ANIMATED_ROTO = true

// Wrapper HOC to add duotone (20% fill) support, auto-inject animations, and handle group hovers
function wrapIcon(LucideIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>): Icon {
  const name = LucideIcon.displayName
  let AnimatedIcon: React.ComponentType<IconProps> | null = null
  if (!LUCIDE_ANIMATED_ROTO && name && (LucideAnimated as Record<string, React.ComponentType<IconProps>>)[`${name}Icon`]) {
    AnimatedIcon = (LucideAnimated as Record<string, React.ComponentType<IconProps>>)[`${name}Icon`]
  }

  const Component = React.forwardRef<SVGSVGElement, IconProps>(
    ({ duotone, size = 24, className, sinAnimacion, ...props }, forwardedRef) => {
      const containerRef = useRef<HTMLSpanElement>(null)
      const internalAnimatedRef = useRef<{ startAnimation?: () => void, stopAnimation?: () => void }>(null)
      const usarAnimado = !!AnimatedIcon && !sinAnimacion

      useEffect(() => {
        if (!usarAnimado) return
        const span = containerRef.current
        if (!span) return

        const groupParent = span.closest('.group')
        if (groupParent) {
          const handleEnter = () => internalAnimatedRef.current?.startAnimation?.()
          const handleLeave = () => internalAnimatedRef.current?.stopAnimation?.()

          groupParent.addEventListener('mouseenter', handleEnter)
          groupParent.addEventListener('mouseleave', handleLeave)

          return () => {
            groupParent.removeEventListener('mouseenter', handleEnter)
            groupParent.removeEventListener('mouseleave', handleLeave)
          }
        }
      }, [usarAnimado])

      const extraProps: Record<string, string | number> = {}
      if (duotone) {
        extraProps.fill = 'currentColor'
        extraProps.fillOpacity = 0.2
      }

      const BaseIcon = usarAnimado ? AnimatedIcon! : LucideIcon
      const iconRef = usarAnimado ? internalAnimatedRef : forwardedRef

      const fallbackClass = (!usarAnimado && !sinAnimacion) ? 'transition-transform duration-200 group-hover:scale-110 hover:scale-110' : ''
      const combinedClassName = [className, fallbackClass].filter(Boolean).join(' ')

      const IconEl = (
        <BaseIcon
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={iconRef as any}
          size={size}
          className={combinedClassName}
          {...extraProps}
          {...props}
        />
      )

      if (usarAnimado) {
        return (
          <span ref={containerRef} className="contents">
            {IconEl}
          </span>
        )
      }

      return IconEl
    }
  )
  Component.displayName = name || 'Icon'
  return Component as Icon
}

// ─── CUSTOM IA/AI ICON ───
export const IaIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ size = 24, className = '', duotone, fill, fillOpacity, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={duotone ? 'currentColor' : fill || 'none'}
        fillOpacity={duotone ? 0.2 : fillOpacity}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <text
          x="50%"
          y="51%"
          dominantBaseline="central"
          textAnchor="middle"
          fontFamily="seravek, ui-sans-serif, sans-serif"
          fontSize="12"
          fontWeight="800"
          fill="currentColor"
          stroke="none"
        >
          IA
        </text>
      </svg>
    )
  }
) as Icon
IaIcon.displayName = 'IaIcon'

// Re-export standard Lucide icon types
export type { LucideIcon } from 'lucide-react'

// Export wrapped icons
export const Sun = wrapIcon(Lucide.Sun)
export const Moon = wrapIcon(Lucide.Moon)
export const Monitor = wrapIcon(Lucide.Monitor)
export const ArrowLeft = wrapIcon(Lucide.ArrowLeft)
export const ArrowRight = wrapIcon(Lucide.ArrowRight)
export const Medal = wrapIcon(Lucide.Medal)
export const Bell = wrapIcon(Lucide.Bell)
export const Question = wrapIcon(Lucide.CircleHelp)
export const ChatCircle = wrapIcon(Lucide.MessageSquare) // Prefer MessageSquare over MessageCircle (preferir message-square)
export const Envelope = wrapIcon(Lucide.Mail)
export const Warning = wrapIcon(Lucide.TriangleAlert)
export const CreditCard = wrapIcon(Lucide.CreditCard)
export const UserPlus = wrapIcon(Lucide.UserPlus)
export const Clock = wrapIcon(Lucide.Clock)

// Los 5 íconos de abajo antes eran SVGs dibujados a mano con animaciones
// propias (rotate/translate/scale combinadas) — Lucide ya trae exactamente
// estos mismos íconos con ese mismo nombre, así que se pasan por wrapIcon
// como el resto: usa la versión animada de lucide-animated.com si existe
// (hoy solo ChartLine la tiene), si no cae al zoom estándar del sistema.
// Nunca se vuelve a dibujar un ícono a mano cuando Lucide ya lo tiene.
export const MapPinHouse = wrapIcon(Lucide.MapPinHouse)
export const ChartLine = wrapIcon(Lucide.ChartLine)
export const Receipt = wrapIcon(Lucide.Receipt)
export const Handshake = wrapIcon(Lucide.Handshake)

export const Timer = wrapIcon(Lucide.Timer)
export const Hourglass = wrapIcon(Lucide.Hourglass)
export const CheckCircle = wrapIcon(Lucide.CheckCircle)
export const XCircle = wrapIcon(Lucide.XCircle)
export const Users = wrapIcon(Lucide.Users)
export const CircleNotch = wrapIcon(Lucide.Loader2)
export const Copy = wrapIcon(Lucide.Copy)
export const Check = wrapIcon(Lucide.Check)
export const Link = wrapIcon(Lucide.Link)
export const Leaf = wrapIcon(Lucide.Leaf)
export const Drop = wrapIcon(Lucide.Droplet)
export const Globe = wrapIcon(Lucide.Globe)
export const Tree = wrapIcon(Lucide.TreeDeciduous)
export const Car = wrapIcon(Lucide.Car)
export const Upload = wrapIcon(Lucide.Upload)
export const FloppyDisk = wrapIcon(Lucide.Save)
export const Buildings = wrapIcon(Lucide.Building2)
export const Calendar = wrapIcon(Lucide.Calendar)
export const Info = wrapIcon(Lucide.Info)
export const MagnifyingGlass = wrapIcon(Lucide.Search)
export const ShieldCheck = wrapIcon(Lucide.ShieldCheck)
export const ShieldWarning = wrapIcon(Lucide.ShieldAlert)
export const FileX = wrapIcon(Lucide.FileX)
export const X = wrapIcon(Lucide.X)
export const FileText = wrapIcon(Lucide.FileText)
export const Shield = wrapIcon(Lucide.Shield)
export const Database = wrapIcon(Lucide.Database)
export const Cookie = wrapIcon(Lucide.Cookie)
export const Lock = wrapIcon(Lucide.Lock)
export const LockOpen = wrapIcon(Lucide.Unlock)
export const ChartBar = wrapIcon(Lucide.BarChart2)
export const Eye = wrapIcon(Lucide.Eye)
export const EyeSlash = wrapIcon(Lucide.EyeOff)
export const Key = wrapIcon(Lucide.Key)
export const Package = wrapIcon(Lucide.Package)
export const Sofa = wrapIcon(Lucide.Sofa)
export const Truck = wrapIcon(Lucide.Truck)
export const Folder = wrapIcon(Lucide.Folder)
export const EllipsisVertical = wrapIcon(Lucide.EllipsisVertical)
export const ClockCounterClockwise = wrapIcon(Lucide.History)
export const Lifebuoy = wrapIcon(Lucide.LifeBuoy)
export const Star = wrapIcon(Lucide.Star)
export const Calculator = wrapIcon(Lucide.Calculator)
export const Tray = wrapIcon(Lucide.Inbox)
export const Download = wrapIcon(Lucide.Download)
export const Share2 = wrapIcon(Lucide.Share2)
export const TrendUp = wrapIcon(Lucide.TrendingUp)
export const TrendDown = wrapIcon(Lucide.TrendingDown)
export const Headphones = wrapIcon(Lucide.Headphones)
export const Stack = wrapIcon(Lucide.Layers)
export const Plus = wrapIcon(Lucide.Plus)
export const Power = wrapIcon(Lucide.Power)
export const CaretDown = wrapIcon(Lucide.ChevronDown)
export const Columns3 = wrapIcon(Lucide.Columns3)
export const CaretRight = wrapIcon(Lucide.ChevronRight)
export const CaretLeft = wrapIcon(Lucide.ChevronLeft)
export const CaretUp = wrapIcon(Lucide.ChevronUp)
export const PlusCircle = wrapIcon(Lucide.PlusCircle)
export const ArrowSquareOut = wrapIcon(Lucide.ExternalLink)
export const Funnel = wrapIcon(Lucide.Filter)
export const Tag = wrapIcon(Lucide.Tag)
export const PencilSimple = wrapIcon(Lucide.Pencil)
export const Target = wrapIcon(Lucide.Target)
export const Pulse = wrapIcon(Lucide.Activity)
export const Trash = wrapIcon(Lucide.Trash2)
export const Trophy = wrapIcon(Lucide.Trophy)
export const PaperPlaneRight = wrapIcon(Lucide.SendHorizontal)
export const PaperPlaneTilt = wrapIcon(Lucide.SendHorizontal)
export const CursorClick = wrapIcon(Lucide.MousePointerClick)
export const EnvelopeOpen = wrapIcon(Lucide.MailOpen)
export const WarningCircle = wrapIcon(Lucide.AlertCircle)
export const Building = wrapIcon(Lucide.Building)
export const User = wrapIcon(Lucide.User)
export const Gear = wrapIcon(Lucide.Settings)
export const SignOut = wrapIcon(Lucide.LogOut)
export const UserCheck = wrapIcon(Lucide.UserCheck)
export const List = wrapIcon(Lucide.List)
export const Menu = wrapIcon(Lucide.Menu)
export const SquaresFour = wrapIcon(Lucide.LayoutGrid)
export const Scroll = wrapIcon(Lucide.Scroll)
export const House = wrapIcon(Lucide.Home)
export const Scales = wrapIcon(Lucide.Scale)
export const Minus = wrapIcon(Lucide.Minus)
export const CaretUpDown = wrapIcon(Lucide.ChevronsUpDown)
export const Flask = wrapIcon(Lucide.FlaskConical)
export const Lightning = wrapIcon(Lucide.Zap)
export const Cpu = wrapIcon(Lucide.Cpu)
export const Shower = wrapIcon(Lucide.ShowerHead)
export const ArrowCounterClockwise = wrapIcon(Lucide.RotateCcw)
export const Image = wrapIcon(Lucide.Image)
export const Phone = wrapIcon(Lucide.Phone)
export const SquareHalf = wrapIcon(Lucide.SquareSplitHorizontal)
export const Spinner = wrapIcon(Lucide.Loader2)


// --- AUTO-GENERATED EXPORTS ---
export const Activity = wrapIcon(Lucide.Activity)
export const AlertCircle = wrapIcon(Lucide.AlertCircle)
export const ArrowDown = wrapIcon(Lucide.ArrowDown)
export const ArrowUp = wrapIcon(Lucide.ArrowUp)
export const ArrowUpDown = wrapIcon(Lucide.ArrowUpDown)
export const BarChart2 = wrapIcon(Lucide.BarChart2)
export const Bath = wrapIcon(Lucide.Bath)
export const BookOpen = wrapIcon(Lucide.BookOpen)
export const Bot = wrapIcon(Lucide.Bot)
export const Building2 = wrapIcon(Lucide.Building2)
export const Camera = wrapIcon(Lucide.Camera)
export const ChevronDown = wrapIcon(Lucide.ChevronDown)
export const ChevronLeft = wrapIcon(Lucide.ChevronLeft)
export const ChevronRight = wrapIcon(Lucide.ChevronRight)
export const ChevronUp = wrapIcon(Lucide.ChevronUp)
export const ChevronsUpDown = wrapIcon(Lucide.ChevronsUpDown)
export const Circle = wrapIcon(Lucide.Circle)
export const CircleDollarSign = wrapIcon(Lucide.CircleDollarSign)
export const CircleHelp = wrapIcon(Lucide.CircleHelp)
export const CircleUser = wrapIcon(Lucide.CircleUser)
export const ClipboardList = wrapIcon(Lucide.ClipboardList)
export const ClipboardPaste = wrapIcon(Lucide.ClipboardPaste)
export const Droplet = wrapIcon(Lucide.Droplet)
export const Dumbbell = wrapIcon(Lucide.Dumbbell)
export const ExternalLink = wrapIcon(Lucide.ExternalLink)
export const EyeOff = wrapIcon(Lucide.EyeOff)
export const Filter = wrapIcon(Lucide.Filter)
export const FlaskConical = wrapIcon(Lucide.FlaskConical)
export const Hammer = wrapIcon(Lucide.Hammer)
export const Headset = wrapIcon(Lucide.Headset)
export const HeartHandshake = wrapIcon(Lucide.HeartHandshake)
export const History = wrapIcon(Lucide.History)
export const Home = wrapIcon(Lucide.Home)
export const IdCard = wrapIcon(Lucide.IdCard)
export const MapPin = wrapIcon(Lucide.MapPin)
export const Pin = wrapIcon(Lucide.Pin)
export const PinOff = wrapIcon(Lucide.PinOff)
export const Inbox = wrapIcon(Lucide.Inbox)
export const KeyRound = wrapIcon(Lucide.KeyRound)
export const Layers = wrapIcon(Lucide.Layers)
export const LayoutGrid = wrapIcon(Lucide.LayoutGrid)
export const LifeBuoy = wrapIcon(Lucide.LifeBuoy)
export const Loader2 = wrapIcon(Lucide.Loader2)
export const LockKeyhole = wrapIcon(Lucide.LockKeyhole)
export const LogOut = wrapIcon(Lucide.LogOut)
export const Mail = wrapIcon(Lucide.Mail)
export const MessageSquare = wrapIcon(Lucide.MessageSquare)
export const MinusCircle = wrapIcon(Lucide.MinusCircle)
export const PenLine = wrapIcon(Lucide.PenLine)
export const Pencil = wrapIcon(Lucide.Pencil)
export const Percent = wrapIcon(Lucide.Percent)
export const QrCode = wrapIcon(Lucide.QrCode)
export const Quote = wrapIcon(Lucide.Quote)
export const RefreshCcw = wrapIcon(Lucide.RefreshCcw)
export const RefreshCw = wrapIcon(Lucide.RefreshCw)
export const RotateCcw = wrapIcon(Lucide.RotateCcw)
export const Save = wrapIcon(Lucide.Save)
export const Scale = wrapIcon(Lucide.Scale)
export const Search = wrapIcon(Lucide.Search)
export const Send = wrapIcon(Lucide.Send)
export const SendHorizontal = wrapIcon(Lucide.SendHorizontal)
export const Settings = wrapIcon(Lucide.Settings)
export const GripVertical = wrapIcon(Lucide.GripVertical)
export const ShowerHead = wrapIcon(Lucide.ShowerHead)
export const SlidersHorizontal = wrapIcon(Lucide.SlidersHorizontal)
export const Square = wrapIcon(Lucide.Square)
export const SquareCheck = wrapIcon(Lucide.SquareCheck)
export const Store = wrapIcon(Lucide.Store)
export const Trash2 = wrapIcon(Lucide.Trash2)
export const TreeDeciduous = wrapIcon(Lucide.TreeDeciduous)
export const TrendingDown = wrapIcon(Lucide.TrendingDown)
export const TrendingUp = wrapIcon(Lucide.TrendingUp)
export const TriangleAlert = wrapIcon(Lucide.TriangleAlert)
export const Zap = wrapIcon(Lucide.Zap)
export const Sparkles = wrapIcon(Lucide.Sparkles)
export const Highlighter = wrapIcon(Lucide.Highlighter)
export const CaseUpper = wrapIcon(Lucide.CaseUpper)
export const ALargeSmall = wrapIcon(Lucide.ALargeSmall)
export const SmilePlus = wrapIcon(Lucide.SmilePlus)
export const Bold = wrapIcon(Lucide.Bold)
export const Undo2 = wrapIcon(Lucide.Undo2)
export const Redo2 = wrapIcon(Lucide.Redo2)
export const Italic = wrapIcon(Lucide.Italic)
export const Underline = wrapIcon(Lucide.Underline)
export const CaseSensitive = wrapIcon(Lucide.CaseSensitive)
export const CheckCheck = wrapIcon(Lucide.CheckCheck)

// Export brand logos from brand-logos.tsx
export {
  WhatsappLogo,
  LinkedinLogo,
  InstagramLogo,
  FacebookLogo,
  XLogo,
  YoutubeLogo,
} from './brand-logos'
