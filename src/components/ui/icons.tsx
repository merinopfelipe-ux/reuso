'use client'

import React, { useEffect, useRef } from 'react'
import * as Lucide from 'lucide-react'
import { motion, useAnimation, type Variants, type Transition } from 'motion/react'

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

// `@animateicons/react/lucide` (animateicons.in) NUNCA fue la librería
// correcta — es un sitio distinto, parecido de nombre, a
// https://lucide-animated.com/ que el usuario pidió explícitamente. Se
// confirmó con depuración en vivo (2026-08-20) que su motor interno nunca
// produce un cambio visual real en este proyecto, ni siquiera actualizado
// a su última versión (0.4.3) — el paquete se desinstaló por completo.
//
// lucide-animated.com no se distribuye como paquete npm normal: es un
// registro estilo shadcn (`npx shadcn add https://lucide-animated.com/r/<icono>.json`)
// que entrega el código fuente REAL (sin minificar) de cada ícono, escrito
// con el paquete `motion` (ya instalado en este proyecto) — no con la
// LazyMotion minificada que causaba el bug de la librería anterior. Los
// componentes de abajo son ese código fuente real, descargado directo del
// registro oficial y adaptado a nuestro `IconProps`/patrón de un solo hub
// (en vez de un archivo por ícono en components/icons/, que es como lo
// entrega el CLI de shadcn — no usamos shadcn en este proyecto).
//
// Portados hoy: User, MapPinHouse, Clock, ChartLine, Receipt — los 5 que
// esta sesión necesitaba y que sí existen en el registro (Sofa y Filter no
// tienen versión animada ahí, caen al zoom estándar, correcto). Para
// portar un ícono nuevo: `curl https://lucide-animated.com/r/<nombre-en-kebab-case>.json`,
// tomar `files[0].content`, y agregarlo aquí con el mismo patrón.
const HAND_TRANSITION: Transition = { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
const HAND_VARIANTS: Variants = { normal: { rotate: 0, originX: '0%', originY: '100%' }, animate: { rotate: 360, originX: '0%', originY: '100%' } }
const MINUTE_HAND_TRANSITION: Transition = { duration: 0.5, ease: 'easeInOut' }
const MINUTE_HAND_VARIANTS: Variants = { normal: { rotate: 0, originX: '0%', originY: '100%' }, animate: { rotate: 45, originX: '0%', originY: '100%' } }

// Todas las constantes Variants/Transition de abajo viven a nivel de
// módulo (nunca dentro del cuerpo del componente) — descubierto con un bug
// real: si un ícono vive dentro de una card que se re-renderiza seguido
// (ej. "Meta", cuyo medidor anima con requestAnimationFrame ~60 veces por
// segundo durante 800ms), un objeto Variants recreado en cada render pierde
// la animación en curso de motion (la cancela/reinicia antes de que se vea),
// aunque el ícono en sí nunca se desmonta. Los íconos "Meta"/"Ticket
// promedio" (ChartLine/Receipt) fueron el caso real que lo confirmó.
const USER_PATH_VARIANT: Variants = { normal: { pathLength: 1, opacity: 1, pathOffset: 0 }, animate: { pathLength: [0, 1], opacity: [0, 1], pathOffset: [1, 0] } }
const USER_CIRCLE_VARIANT: Variants = { normal: { pathLength: 1, pathOffset: 0, scale: 1 }, animate: { pathLength: [0, 1], pathOffset: [1, 0], scale: [0.5, 1] } }
const USER_PATH_TRANSITION: Transition = { delay: 0.2, duration: 0.4 }

const UserIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <motion.circle animate={controls} cx="12" cy="8" r="5" variants={USER_CIRCLE_VARIANT} />
        <motion.path animate={controls} d="M20 21a8 8 0 0 0-16 0" transition={USER_PATH_TRANSITION} variants={USER_PATH_VARIANT} />
      </svg>
    )
  }
)
UserIconReal.displayName = 'UserIconReal'

const ClockIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" />
        <motion.line animate={controls} initial="normal" transition={HAND_TRANSITION} variants={HAND_VARIANTS} x1="12" x2="12" y1="12" y2="6" />
        <motion.line animate={controls} initial="normal" transition={MINUTE_HAND_TRANSITION} variants={MINUTE_HAND_VARIANTS} x1="12" x2="16" y1="12" y2="12" />
      </svg>
    )
  }
)
ClockIconReal.displayName = 'ClockIconReal'

const MAPPINHOUSE_SVG_VARIANT: Variants = { normal: { y: 0 }, animate: { y: [0, -5, -3], transition: { duration: 0.5, times: [0, 0.6, 1] } } }
const MAPPINHOUSE_HOUSE_VARIANT: Variants = { normal: { opacity: 1 }, animate: { opacity: [0, 1], pathLength: [0, 1], transition: { delay: 0.3, duration: 0.3, opacity: { duration: 0.1, delay: 0.3 } } } }

const MapPinHouseIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <motion.svg animate={controls} initial="normal" variants={MAPPINHOUSE_SVG_VARIANT} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M18 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 .601.2" />
        <circle cx="10" cy="10" r="3" />
        <motion.path animate={controls} initial="normal" variants={MAPPINHOUSE_HOUSE_VARIANT} d="M15 22a1 1 0 0 1-1-1v-4a1 1 0 0 1 .445-.832l3-2a1 1 0 0 1 1.11 0l3 2A1 1 0 0 1 22 17v4a1 1 0 0 1-1 1z M18 22v-3" />
      </motion.svg>
    )
  }
)
MapPinHouseIconReal.displayName = 'MapPinHouseIconReal'

const CHARTLINE_VARIANT: Variants = { normal: { pathLength: 1, opacity: 1 }, animate: { pathLength: [0, 1], opacity: [0, 1], transition: { delay: 0.15, duration: 0.3, opacity: { delay: 0.1 } } } }

const ChartLineIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <motion.path animate={controls} d="m7 13 3-3 4 4 5-5" variants={CHARTLINE_VARIANT} />
      </svg>
    )
  }
)
ChartLineIconReal.displayName = 'ChartLineIconReal'

const RECEIPT_MAIN_VARIANT: Variants = { normal: { opacity: 1, pathLength: 1, transition: { duration: 0.4, opacity: { duration: 0.1 } } }, animate: { opacity: [0, 1], pathLength: [0, 1], transition: { duration: 0.6, opacity: { duration: 0.1 } } } }
const RECEIPT_SECONDARY_VARIANT: Variants = { normal: { opacity: 1, pathLength: 1, pathOffset: 0, transition: { delay: 0.3, duration: 0.3, opacity: { duration: 0.1, delay: 0.3 } } }, animate: { opacity: [0, 1], pathLength: [0, 1], pathOffset: [1, 0], transition: { delay: 0.5, duration: 0.4, opacity: { duration: 0.1, delay: 0.5 } } } }

const ReceiptIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <motion.path animate={controls} initial="normal" variants={RECEIPT_SECONDARY_VARIANT} d="M12 17V7" />
        <motion.path animate={controls} initial="normal" variants={RECEIPT_MAIN_VARIANT} d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" />
        <path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z" />
      </svg>
    )
  }
)
ReceiptIconReal.displayName = 'ReceiptIconReal'

// Los siguientes 12 (Bell, Settings, ChevronRight, Download, Upload, Copy,
// Send, Eye, EyeOff, Plus, Heart, Zap) alimentan la demo de micro-
// interacciones de /sistema-diseno — mismo origen (registro real de
// lucide-animated.com), mismo patrón. Trash y Star no existen en ese
// registro, se quedan con el zoom estándar (correcto, ver arriba).
const BELL_TRANSITION: Transition = { duration: 0.5, ease: 'easeInOut' }
const BELL_VARIANT: Variants = { normal: { rotate: 0 }, animate: { rotate: [0, -10, 10, -10, 0] } }

const BellIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <motion.svg animate={controls} transition={BELL_TRANSITION} variants={BELL_VARIANT} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </motion.svg>
    )
  }
)
BellIconReal.displayName = 'BellIconReal'

const SETTINGS_TRANSITION: Transition = { type: 'spring', stiffness: 50, damping: 10 }
const SETTINGS_VARIANT: Variants = { normal: { rotate: 0 }, animate: { rotate: 180 } }

const SettingsIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <motion.svg animate={controls} transition={SETTINGS_TRANSITION} variants={SETTINGS_VARIANT} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </motion.svg>
    )
  }
)
SettingsIconReal.displayName = 'SettingsIconReal'

const CHEVRONRIGHT_TRANSITION: Transition = { times: [0, 0.4, 1], duration: 0.5 }
const CHEVRONRIGHT_VARIANT: Variants = { normal: { x: 0 }, animate: { x: [0, 2, 0] } }

const ChevronRightIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <motion.path animate={controls} d="m9 18 6-6-6-6" transition={CHEVRONRIGHT_TRANSITION} variants={CHEVRONRIGHT_VARIANT} />
      </svg>
    )
  }
)
ChevronRightIconReal.displayName = 'ChevronRightIconReal'

const DOWNLOAD_VARIANT: Variants = { normal: { y: 0 }, animate: { y: 2, transition: { type: 'spring', stiffness: 200, damping: 10, mass: 1 } } }

const DownloadIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <motion.g animate={controls} variants={DOWNLOAD_VARIANT}>
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </motion.g>
      </svg>
    )
  }
)
DownloadIconReal.displayName = 'DownloadIconReal'

const UPLOAD_VARIANT: Variants = { normal: { y: 0 }, animate: { y: -2, transition: { type: 'spring', stiffness: 200, damping: 10, mass: 1 } } }

const UploadIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <motion.g animate={controls} variants={UPLOAD_VARIANT}>
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        </motion.g>
      </svg>
    )
  }
)
UploadIconReal.displayName = 'UploadIconReal'

const COPY_TRANSITION: Transition = { type: 'spring', stiffness: 160, damping: 17, mass: 1 }
const COPY_RECT_VARIANT: Variants = { normal: { translateY: 0, translateX: 0 }, animate: { translateY: -3, translateX: -3 } }
const COPY_PATH_VARIANT: Variants = { normal: { x: 0, y: 0 }, animate: { x: 3, y: 3 } }

const CopyIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <motion.rect animate={controls} height="14" rx="2" ry="2" width="14" x="8" y="8" transition={COPY_TRANSITION} variants={COPY_RECT_VARIANT} />
        <motion.path animate={controls} d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" transition={COPY_TRANSITION} variants={COPY_PATH_VARIANT} />
      </svg>
    )
  }
)
CopyIconReal.displayName = 'CopyIconReal'

const SEND_G_TRANSITION: Transition = { duration: 0.5 }
const SEND_G_VARIANT: Variants = { normal: { x: 0, y: 0, scale: 1 }, animate: { x: 3, y: -3, scale: 0.8 } }
const SEND_PATH_TRANSITION: Transition = { duration: 0.55, delay: 0.1 }
const SEND_PATH_INITIAL = { opacity: 0, pathLength: 0 }
const SEND_PATH_VARIANT: Variants = {
  normal: { pathLength: 0, opacity: 0, translateX: -3, translateY: 3, transition: { duration: 0.3 } },
  animate: { pathLength: 1, opacity: 1, translateX: 0, translateY: 0 },
}

const SendIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg className="overflow-visible" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <motion.g animate={controls} transition={SEND_G_TRANSITION} variants={SEND_G_VARIANT} className={className}>
          <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
          <path d="m21.854 2.147-10.94 10.939" />
        </motion.g>
        <motion.path
          animate={controls}
          d="M -3 28 C -0.5 26.8 1.6 24.6 3.3 22 C 4.8 19.7 5.2 17.6 4.2 16.1 C 3.2 14.7 1.4 14.5 0.3 15.8 C -0.9 17.2 -0.6 19.4 1.2 20.4 C 3.4 21.5 6.4 19.4 9 15.8"
          fill="none"
          initial={SEND_PATH_INITIAL}
          stroke={color}
          strokeDasharray="2 2"
          strokeWidth="1"
          transition={SEND_PATH_TRANSITION}
          variants={SEND_PATH_VARIANT}
        />
      </svg>
    )
  }
)
SendIconReal.displayName = 'SendIconReal'

const EYE_TRANSITION: Transition = { duration: 0.4, ease: 'easeInOut' }
const EYE_PATH_VARIANT: Variants = { normal: { scaleY: 1, opacity: 1 }, animate: { scaleY: [1, 0.1, 1], opacity: [1, 0.3, 1] } }
const EYE_CIRCLE_VARIANT: Variants = { normal: { scale: 1, opacity: 1 }, animate: { scale: [1, 0.3, 1], opacity: [1, 0.3, 1] } }
const EYE_PATH_STYLE = { originY: '50%' }

const EyeIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <motion.path animate={controls} d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" style={EYE_PATH_STYLE} transition={EYE_TRANSITION} variants={EYE_PATH_VARIANT} />
        <motion.circle animate={controls} cx="12" cy="12" r="3" transition={EYE_TRANSITION} variants={EYE_CIRCLE_VARIANT} />
      </svg>
    )
  }
)
EyeIconReal.displayName = 'EyeIconReal'

const EYEOFF_VARIANT: Variants = { normal: { pathLength: 1, opacity: 1, pathOffset: 0 }, animate: { pathLength: [0, 2], opacity: [0, 1], pathOffset: [0, 2], transition: { duration: 0.6 } } }

const EyeOffIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
        <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
        <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
        <motion.path animate={controls} d="m2 2 20 20" variants={EYEOFF_VARIANT} />
      </svg>
    )
  }
)
EyeOffIconReal.displayName = 'EyeOffIconReal'

const PLUS_TRANSITION: Transition = { type: 'spring', stiffness: 100, damping: 15 }
const PLUS_VARIANT: Variants = { normal: { rotate: 0 }, animate: { rotate: 180 } }

const PlusIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <motion.svg animate={controls} transition={PLUS_TRANSITION} variants={PLUS_VARIANT} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </motion.svg>
    )
  }
)
PlusIconReal.displayName = 'PlusIconReal'

const HEART_TRANSITION: Transition = { duration: 0.45, repeat: 2 }
const HEART_VARIANT: Variants = { normal: { scale: 1 }, animate: { scale: [1, 1.08, 1] } }

const HeartIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <motion.svg animate={controls} transition={HEART_TRANSITION} variants={HEART_VARIANT} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </motion.svg>
    )
  }
)
HeartIconReal.displayName = 'HeartIconReal'

const ZAP_VARIANT: Variants = { normal: { opacity: 1, pathLength: 1, transition: { duration: 0.6, opacity: { duration: 0.1 } } }, animate: { opacity: [0, 1], pathLength: [0, 1], transition: { duration: 0.6, opacity: { duration: 0.1 } } } }

const ZapIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <motion.path animate={controls} d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" variants={ZAP_VARIANT} />
      </svg>
    )
  }
)
ZapIconReal.displayName = 'ZapIconReal'

// ─── ANIMATED CALCULATION & SYSTEM ICONS ──────────────────────────────────────
const LEAF_VARIANTS: Variants = { normal: { rotate: 0, scale: 1 }, animate: { rotate: [0, -15, 12, -8, 0], scale: [1, 1.15, 1], transition: { duration: 0.7, ease: 'easeInOut' } } }
const LeafIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <motion.svg animate={controls} variants={LEAF_VARIANTS} style={{ originX: '20%', originY: '90%' }} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </motion.svg>
    )
  }
)
LeafIconReal.displayName = 'LeafIconReal'

const SHOWER_DROP_1: Variants = { normal: { opacity: 0.4, y: 0 }, animate: { opacity: [0.2, 1, 0.2], y: [0, 4, 0], transition: { duration: 0.5, repeat: 1 } } }
const SHOWER_DROP_2: Variants = { normal: { opacity: 0.4, y: 0 }, animate: { opacity: [0.2, 1, 0.2], y: [0, 5, 0], transition: { duration: 0.5, delay: 0.15, repeat: 1 } } }
const SHOWER_DROP_3: Variants = { normal: { opacity: 0.4, y: 0 }, animate: { opacity: [0.2, 1, 0.2], y: [0, 4, 0], transition: { duration: 0.5, delay: 0.3, repeat: 1 } } }
const ShowerHeadIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="m4 4 2.5 2.5" />
        <path d="M13.5 6.5a4.95 4.95 0 0 0-7 7L11 18l7-7-4.5-4.5Z" />
        <path d="M15 5 11 9" />
        <motion.path animate={controls} variants={SHOWER_DROP_1} d="M10 21v.01" />
        <motion.path animate={controls} variants={SHOWER_DROP_2} d="M17 19v.01" />
        <motion.path animate={controls} variants={SHOWER_DROP_3} d="M14 22v.01" />
      </svg>
    )
  }
)
ShowerHeadIconReal.displayName = 'ShowerHeadIconReal'

const DROPLET_VARIANTS: Variants = { normal: { scale: 1, y: 0 }, animate: { scale: [1, 1.2, 0.95, 1], y: [0, -3, 2, 0], transition: { duration: 0.6, ease: 'easeInOut' } } }
const DropletIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <motion.svg animate={controls} variants={DROPLET_VARIANTS} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
      </motion.svg>
    )
  }
)
DropletIconReal.displayName = 'DropletIconReal'

const TRASH_LID_VARIANTS: Variants = { normal: { rotate: 0, y: 0 }, animate: { rotate: [0, -28, -28, 0], y: [0, -3, -3, 0], transition: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] } } }
const Trash2IconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <motion.g animate={controls} variants={TRASH_LID_VARIANTS} style={{ originX: '20%', originY: '25%' }}>
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </motion.g>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <line x1="10" x2="10" y1="11" y2="17" />
        <line x1="14" x2="14" y1="11" y2="17" />
      </svg>
    )
  }
)
Trash2IconReal.displayName = 'Trash2IconReal'

const CALC_VARIANTS: Variants = { normal: { scale: 1 }, animate: { scale: [1, 0.92, 1.08, 0.96, 1], transition: { duration: 0.55, ease: 'easeOut' } } }
const CalculatorIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <motion.svg animate={controls} variants={CALC_VARIANTS} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="20" x="4" y="2" rx="2" />
        <line x1="8" x2="16" y1="6" y2="6" />
        <line x1="16" x2="16" y1="14" y2="18" />
        <path d="M16 10h.01" />
        <path d="M12 10h.01" />
        <path d="M8 10h.01" />
        <path d="M12 14h.01" />
        <path d="M8 14h.01" />
        <path d="M12 18h.01" />
        <path d="M8 18h.01" />
      </motion.svg>
    )
  }
)
CalculatorIconReal.displayName = 'CalculatorIconReal'

const SHIELD_CHECK_VARIANTS: Variants = { normal: { pathLength: 1, opacity: 1 }, animate: { pathLength: [0, 1], opacity: [0, 1], transition: { duration: 0.45, ease: 'easeOut' } } }
const ShieldCheckIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <motion.path animate={controls} variants={SHIELD_CHECK_VARIANTS} d="m9 12 2 2 4-4" />
      </svg>
    )
  }
)
ShieldCheckIconReal.displayName = 'ShieldCheckIconReal'

const TREE_VARIANTS: Variants = { normal: { rotate: 0 }, animate: { rotate: [0, -10, 10, -6, 0], transition: { duration: 0.7, ease: 'easeInOut' } } }
const TreeDeciduousIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M8 19v3" />
        <path d="M16 19v3" />
        <path d="M12 19v3" />
        <motion.path animate={controls} variants={TREE_VARIANTS} style={{ originX: '50%', originY: '80%' }} d="M12 3a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-1.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z" />
      </svg>
    )
  }
)
TreeDeciduousIconReal.displayName = 'TreeDeciduousIconReal'

const BAR1_VARIANTS: Variants = { normal: { scaleY: 1 }, animate: { scaleY: [1, 0.4, 1.2, 1], transition: { duration: 0.5, ease: 'easeInOut' } } }
const BAR2_VARIANTS: Variants = { normal: { scaleY: 1 }, animate: { scaleY: [1, 0.2, 1.3, 1], transition: { duration: 0.5, delay: 0.1, ease: 'easeInOut' } } }
const BAR3_VARIANTS: Variants = { normal: { scaleY: 1 }, animate: { scaleY: [1, 0.5, 1.15, 1], transition: { duration: 0.5, delay: 0.2, ease: 'easeInOut' } } }
const BarChart2IconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <motion.line animate={controls} variants={BAR1_VARIANTS} style={{ originY: '100%' }} x1="6" x2="6" y1="20" y2="14" />
        <motion.line animate={controls} variants={BAR2_VARIANTS} style={{ originY: '100%' }} x1="12" x2="12" y1="20" y2="4" />
        <motion.line animate={controls} variants={BAR3_VARIANTS} style={{ originY: '100%' }} x1="18" x2="18" y1="20" y2="10" />
      </svg>
    )
  }
)
BarChart2IconReal.displayName = 'BarChart2IconReal'

const CPU_CORE_VARIANTS: Variants = { normal: { scale: 1, opacity: 1 }, animate: { scale: [1, 1.25, 0.95, 1], opacity: [1, 0.7, 1], transition: { duration: 0.5, ease: 'easeInOut' } } }
const CpuIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="16" x="4" y="4" rx="2" />
        <motion.rect animate={controls} variants={CPU_CORE_VARIANTS} style={{ originX: '50%', originY: '50%' }} width="6" height="6" x="9" y="9" rx="1" />
        <path d="M15 2v2" />
        <path d="M15 20v2" />
        <path d="M2 15h2" />
        <path d="M2 9h2" />
        <path d="M20 15h2" />
        <path d="M20 9h2" />
        <path d="M9 2v2" />
        <path d="M9 20v2" />
      </svg>
    )
  }
)
CpuIconReal.displayName = 'CpuIconReal'

const SCISSORS_VARIANTS: Variants = { normal: { rotate: 0 }, animate: { rotate: [0, -18, 12, -8, 0], transition: { duration: 0.6, ease: 'easeInOut' } } }
const ScissorsIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <motion.svg animate={controls} variants={SCISSORS_VARIANTS} style={{ originX: '50%', originY: '50%' }} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="6" cy="6" r="3" />
        <path d="M8.12 8.12 12 12" />
        <path d="M20 4 8.12 15.88" />
        <circle cx="6" cy="18" r="3" />
        <path d="M14.8 14.8 20 20" />
      </motion.svg>
    )
  }
)
ScissorsIconReal.displayName = 'ScissorsIconReal'

const FLASK_VARIANTS: Variants = { normal: { rotate: 0 }, animate: { rotate: [0, -12, 14, -6, 0], transition: { duration: 0.65, ease: 'easeInOut' } } }
const FlaskConicalIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <motion.svg animate={controls} variants={FLASK_VARIANTS} style={{ originX: '50%', originY: '80%' }} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2v7.31" />
        <path d="M14 9.3V2" />
        <path d="M8.5 2h7" />
        <path d="M14 9.3 19.66 18.5a2 2 0 0 1-1.72 3H6.06a2 2 0 0 1-1.72-3L10 9.3" />
        <line x1="5.52" x2="18.48" y1="16" y2="16" />
      </motion.svg>
    )
  }
)
FlaskConicalIconReal.displayName = 'FlaskConicalIconReal'

const SCALES_VARIANTS: Variants = { normal: { rotate: 0 }, animate: { rotate: [0, -8, 7, -4, 0], transition: { duration: 0.7, ease: 'easeInOut' } } }
const ScalesIconReal = React.forwardRef<{ startAnimation?: () => void, stopAnimation?: () => void }, IconProps>(
  ({ size = 24, className, color = 'currentColor', strokeWidth = 2 }, ref) => {
    const controls = useAnimation()
    React.useImperativeHandle(ref, () => ({ startAnimation: () => controls.start('animate'), stopAnimation: () => controls.start('normal') }))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3v18" />
        <path d="M7 21h10" />
        <motion.g animate={controls} variants={SCALES_VARIANTS} style={{ originX: '50%', originY: '20%' }}>
          <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
          <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
          <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        </motion.g>
      </svg>
    )
  }
)
ScalesIconReal.displayName = 'ScalesIconReal'

// Cast necesario: estos forwardRef exponen {startAnimation, stopAnimation}
// vía ref (un objeto imperativo), no un SVGSVGElement
const LUCIDE_ANIMATED_REAL: Partial<Record<string, React.ComponentType<IconProps>>> = {
  User: UserIconReal,
  Clock: ClockIconReal,
  MapPinHouse: MapPinHouseIconReal,
  ChartLine: ChartLineIconReal,
  Receipt: ReceiptIconReal,
  Bell: BellIconReal,
  Settings: SettingsIconReal,
  ChevronRight: ChevronRightIconReal,
  Download: DownloadIconReal,
  Upload: UploadIconReal,
  Copy: CopyIconReal,
  Send: SendIconReal,
  Eye: EyeIconReal,
  EyeOff: EyeOffIconReal,
  Plus: PlusIconReal,
  Heart: HeartIconReal,
  Zap: ZapIconReal,
  Lightning: ZapIconReal,
  Leaf: LeafIconReal,
  Shower: ShowerHeadIconReal,
  ShowerHead: ShowerHeadIconReal,
  Drop: DropletIconReal,
  Droplet: DropletIconReal,
  Trash: Trash2IconReal,
  Trash2: Trash2IconReal,
  Calculator: CalculatorIconReal,
  ShieldCheck: ShieldCheckIconReal,
  Tree: TreeDeciduousIconReal,
  TreeDeciduous: TreeDeciduousIconReal,
  ChartBar: BarChart2IconReal,
  BarChart2: BarChart2IconReal,
  Cpu: CpuIconReal,
  Scissors: ScissorsIconReal,
  Flask: FlaskConicalIconReal,
  FlaskConical: FlaskConicalIconReal,
  Scale: ScalesIconReal,
  Scales: ScalesIconReal,
} as unknown as Partial<Record<string, React.ComponentType<IconProps>>>

// Wrapper HOC to add duotone (20% fill) support, auto-inject animations, and handle group hovers
function wrapIcon(LucideIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>): Icon {
  const name = LucideIcon.displayName || (LucideIcon as unknown as { name?: string }).name || ''
  const AnimatedIcon: React.ComponentType<IconProps> | null = (name && LUCIDE_ANIMATED_REAL[name]) || null

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
        const targetElement = groupParent || span

        const handleEnter = () => internalAnimatedRef.current?.startAnimation?.()
        const handleLeave = () => internalAnimatedRef.current?.stopAnimation?.()

        targetElement.addEventListener('mouseenter', handleEnter)
        targetElement.addEventListener('mouseleave', handleLeave)

        return () => {
          targetElement.removeEventListener('mouseenter', handleEnter)
          targetElement.removeEventListener('mouseleave', handleLeave)
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
// PROHIBIDO POR SISTEMA DE DISEÑO (2026-08-25):
// El ícono `Target` (círculos concéntricos / diana) queda PROHIBIDO en toda la aplicación
// porque carece de claridad semántica y confunde al usuario. Usar `Scissors`, `Layers`, `Sparkles`, `Cpu` o `Calculator`.
export const Target = wrapIcon(Lucide.Target)
export const Scissors = wrapIcon(Lucide.Scissors)
export const Shirt = wrapIcon(Lucide.Shirt)
export const Pulse = wrapIcon(Lucide.Activity)
export const Trash = wrapIcon(Lucide.Trash2)
export const Heart = wrapIcon(Lucide.Heart)
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
