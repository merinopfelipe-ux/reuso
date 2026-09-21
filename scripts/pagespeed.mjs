#!/usr/bin/env node
/**
 * scripts/pagespeed.mjs
 * Línea base de PageSpeed Insights — 5 rondas por URL, mediana.
 *
 * Uso:
 *   node --env-file=.env.local scripts/pagespeed.mjs
 *   # o con key explícita:
 *   PAGESPEED_API_KEY=AIza... node scripts/pagespeed.mjs
 *
 * Salida: tabla de medianas en consola + JSON en scripts/pagespeed-baseline.json
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

// ── Config ───────────────────────────────────────────────────────────────────

const API_KEY    = process.env.PAGESPEED_API_KEY
const BASE_URL   = process.env.NEXT_PUBLIC_APP_URL || 'https://calculadoradereuso.com'
const RONDAS     = 5
const ESTRATEGIA = 'mobile'   // cambia a 'desktop' para el check de accesibilidad

const URLS = ['/', '/faq', '/login']

const CATS = [
  { key: 'performance',    label: 'Rendimiento'      },
  { key: 'seo',            label: 'SEO'              },
  { key: 'accessibility',  label: 'Accesibilidad'    },
  { key: 'best-practices', label: 'Buenas prácticas' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

const mediana = arr => {
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? Math.round((s[m - 1] + s[m]) / 2) : s[m]
}

const C = s => s >= 90 ? '\x1b[32m' : s >= 50 ? '\x1b[33m' : '\x1b[31m'
const RESET = '\x1b[0m', BOLD = '\x1b[1m', DIM = '\x1b[2m'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function medirUna(url) {
  const endpoint =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(url)}&strategy=${ESTRATEGIA}&key=${API_KEY}` +
    CATS.map(c => `&category=${c.key}`).join('')
  const res  = await fetch(endpoint)
  const data = await res.json()
  if (!res.ok) throw new Error(`PSI ${res.status}: ${(data?.error?.message ?? '').slice(0, 160)}`)
  const cats = data.lighthouseResult?.categories ?? {}
  return Object.fromEntries(CATS.map(c => [c.key, Math.round((cats[c.key]?.score ?? 0) * 100)]))
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const ts = new Date().toISOString()
  console.log(`\n${BOLD}📊  PageSpeed Baseline — ${ESTRATEGIA.toUpperCase()}${RESET}`)
  console.log(`${DIM}Base: ${BASE_URL}  ·  ${RONDAS} rondas/URL  ·  ${ts}${RESET}\n`)

  if (!API_KEY) {
    console.error('\x1b[31m✗  PAGESPEED_API_KEY no definida.\x1b[0m\n  Ejecuta: node --env-file=.env.local scripts/pagespeed.mjs')
    process.exit(1)
  }

  const resultados = {}

  for (const ruta of URLS) {
    const urlCompleta = `${BASE_URL.replace(/\/$/, '')}${ruta}`
    console.log(`${BOLD}▶  ${ruta}${RESET}  ${DIM}(${urlCompleta})${RESET}`)

    const rondas = []
    for (let i = 1; i <= RONDAS; i++) {
      try {
        process.stdout.write(`   Ronda ${i}/${RONDAS}… `)
        const sc = await medirUna(urlCompleta)
        rondas.push(sc)
        console.log(`Rend ${C(sc.performance)}${sc.performance}${RESET}  SEO ${sc.seo}  Acc ${sc.accessibility}  BP ${sc['best-practices']}`)
      } catch (e) {
        console.log(`\x1b[31m${e.message}\x1b[0m`)
        rondas.push(null)
      }
      if (i < RONDAS) await sleep(6500)
    }

    const validas = rondas.filter(Boolean)
    const meds = validas.length
      ? Object.fromEntries(CATS.map(c => [c.key, mediana(validas.map(r => r[c.key]))]))
      : null

    resultados[ruta] = { url: urlCompleta, rondas, medianas: meds }

    if (meds) {
      console.log(`   ${DIM}── Mediana ─────────────────────────────${RESET}`)
      for (const c of CATS) {
        const s   = meds[c.key]
        const min = Math.min(...validas.map(r => r[c.key]))
        const max = Math.max(...validas.map(r => r[c.key]))
        const bar = '█'.repeat(Math.round(s / 10)).padEnd(10, '░')
        console.log(`   ${c.label.padEnd(18)} ${C(s)}${BOLD}${String(s).padStart(3)}${RESET}  ${bar}  ${DIM}rango ${min}–${max}${RESET}`)
      }
    } else {
      console.log(`   \x1b[31mSin rondas válidas.\x1b[0m`)
    }
    console.log()
  }

  // Resumen
  console.log(`${BOLD}━━  Resumen ${ESTRATEGIA.toUpperCase()}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`)
  console.log(`${DIM}${'URL'.padEnd(10)}${ CATS.map(c => c.label.padStart(18)).join('') }${RESET}`)
  for (const ruta of URLS) {
    const m = resultados[ruta]?.medianas
    const row = m
      ? CATS.map(c => `${C(m[c.key])}${BOLD}${String(m[c.key]).padStart(18)}${RESET}`).join('')
      : '  sin datos'
    console.log(`${ruta.padEnd(10)}${row}`)
  }
  console.log()

  // Guardar JSON
  const out = resolve(__dir, 'pagespeed-baseline.json')
  writeFileSync(out, JSON.stringify({ ts, estrategia: ESTRATEGIA, base: BASE_URL, resultados }, null, 2))
  console.log(`${DIM}✔  Guardado en scripts/pagespeed-baseline.json${RESET}\n`)
}

main().catch(e => { console.error('\x1b[31m✗', e.message, '\x1b[0m'); process.exit(1) })
