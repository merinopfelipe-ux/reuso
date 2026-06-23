'use client'
import { useRef, ClipboardEvent, KeyboardEvent } from 'react'

interface OTPInputProps {
  value: string
  onChange: (v: string) => void
  isDark?: boolean
  disabled?: boolean
  length?: number
}

export function OTPInput({ value, onChange, isDark = false, disabled = false, length = 6 }: OTPInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>(Array(length).fill(null))

  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    const digit = raw.slice(-1)
    const newDigits = [...digits]
    newDigits[index] = digit
    onChange(newDigits.join(''))
    if (digit && index < length - 1) refs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[index]) {
        const newDigits = [...digits]
        newDigits[index] = ''
        onChange(newDigits.join(''))
      } else if (index > 0) {
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        onChange(newDigits.join(''))
        refs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      refs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      refs.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    onChange(pasted)
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={digit}
          disabled={disabled}
          autoFocus={i === 0}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            flex: 1,
            maxWidth: 52,
            height: 56,
            borderRadius: 12,
            border: `2px solid ${digit ? '#00827C' : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,130,124,0.20)'}`,
            background: digit
              ? (isDark ? 'rgba(214,243,145,0.10)' : 'rgba(0,130,124,0.06)')
              : (isDark ? '#5A5A5A' : '#FFFFFF'),
            color: isDark ? '#FFFFFF' : '#1A3A38',
            fontSize: 22,
            fontWeight: 800,
            textAlign: 'center',
            outline: 'none',
            caretColor: '#00827C',
            fontFamily: "'Open Sans', sans-serif",
            transition: 'border-color 0.15s, background 0.15s',
            cursor: disabled ? 'not-allowed' : 'text',
            opacity: disabled ? 0.5 : 1,
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = isDark ? '#D6F391' : '#00827C'
            e.currentTarget.style.boxShadow = isDark
              ? '0 0 0 3px rgba(214,243,145,0.15)'
              : '0 0 0 3px rgba(0,130,124,0.15)'
          }}
          onBlur={e => {
            const filled = !!e.currentTarget.value
            e.currentTarget.style.borderColor = filled
              ? '#00827C'
              : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,130,124,0.20)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      ))}
    </div>
  )
}
