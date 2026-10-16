import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'
import { MEDICION, METAS, fmt, fechaLarga, resumenVerde } from '@/lib/verde'

export const metadata: Metadata = {
  title: 'Zero Waste Digital 2035 | Calculadora de Reúso',
  description: 'Medimos el peso de nuestras páginas públicas y lo que se puede evitar, con metas cada dos años hasta llegar a cero en 2035.',
  robots: { index: true, follow: true },
}

// Mismos estilos que h2 y p de legal-page-layout. No se importan: ese archivo es 'use client' y
// sus valores no se pueden usar desde un componente de servidor.
const h2: React.CSSProperties = { fontSize: 18, fontWeight: 700, marginTop: 40, marginBottom: 12, color: 'var(--text-primary)' }
const p: React.CSSProperties = { marginBottom: 16, lineHeight: 1.85 }
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }
const thN: React.CSSProperties = { ...th, textAlign: 'right' }
const td: React.CSSProperties = { padding: '10px 12px', fontSize: 14, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)' }
const tdN: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const caja: React.CSSProperties = { overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)', marginBottom: 12 }
const nota: React.CSSProperties = { ...p, fontSize: 13, color: 'var(--text-secondary)' }
const ul: React.CSSProperties = { paddingLeft: 20, marginBottom: 16, listStyleType: 'disc' }
const li: React.CSSProperties = { marginBottom: 8, lineHeight: 1.7 }

function Rotulo({ children }: { children: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--color-brand-light)', color: 'var(--color-brand)', marginLeft: 8, verticalAlign: 'middle' }}>
      {children}
    </span>
  )
}

export default function ZeroWasteDigitalPage() {
  const r = resumenVerde()
  const fecha = fechaLarga(r.fecha)
  const filas = MEDICION.paginas.filter((x) => x.lighthouse)

  return (
    <LegalPageLayout
      titulo="Zero Waste Digital 2035"
      breadcrumbLabel="Zero Waste Digital"
      secciones={[
        { id: 'medido', label: 'Qué medimos hoy' },
        { id: 'metas', label: 'Metas cada dos años' },
        { id: 'co2', label: 'Estimación de CO₂' },
        { id: 'acciones', label: 'Qué hacemos' },
        { id: 'no-medimos', label: 'Lo que aún no medimos' },
        { id: 'verificar', label: 'Cómo verificarlo' },
      ]}
      resumen={`Medimos el peso de nuestras páginas públicas y los bytes que se podrían evitar. Hoy el promedio evitable es ${fmt(r.promedioKB)} KB por página (medido el ${fecha}). La meta es llegar a 0 KB en ${r.cierre.anio}, con un hito cada dos años. Cada cifra lleva su fecha, su método y un rótulo: Medido, Estimado o Meta.`}
      hideResumen={false}
    >
      <p style={p}>
        Cada página que abres descarga bytes, y parte de esos bytes nunca se usan. Los medimos, publicamos la cifra con su fecha y fijamos metas. Todo número de esta página es <strong>Medido</strong> con una herramienta, <strong>Estimado</strong> con un método que explicamos, o <strong>Meta</strong>. Una meta no es un resultado. No publicamos compensaciones de carbono ni cifras que no podamos medir.
      </p>

      <h2 id="medido" style={h2}>Qué medimos hoy<Rotulo>Medido</Rotulo></h2>
      <p style={p}>
        Medimos las páginas públicas con dos herramientas. La primera cuenta los bytes que viajan por la red al abrir la página por primera vez. La segunda es Lighthouse, que además calcula cuántos de esos bytes se podrían evitar, por ejemplo código que se descarga y nunca se ejecuta.
      </p>
      <div style={caja}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <caption style={{ captionSide: 'top', textAlign: 'left', padding: '12px 12px 4px', fontSize: 13, color: 'var(--text-secondary)' }}>
            Medición del {fecha}
          </caption>
          <thead>
            <tr>
              <th style={th}>Página</th>
              <th style={thN}>Transferido (KB)</th>
              <th style={thN}>Peso total Lighthouse (KB)</th>
              <th style={thN}>Evitable (KB)</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((x) => (
              <tr key={x.ruta}>
                <td style={td}>{x.ruta}</td>
                <td style={tdN}>{fmt(x.transferidoKB)}</td>
                <td style={tdN}>{fmt(x.lighthouse!.pesoKB)}</td>
                <td style={tdN}>{fmt(x.lighthouse!.evitableKB)}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...td, fontWeight: 700 }}>Promedio evitable de la línea base</td>
              <td style={tdN} />
              <td style={tdN} />
              <td style={{ ...tdN, fontWeight: 700 }}>{fmt(r.promedioKB)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={nota}>{MEDICION.metodo.transferencia}</p>
      <p style={nota}>{MEDICION.metodo.lighthouse} El peso total de Lighthouse puede ser mayor que lo transferido al abrir la página, porque incluye lo que se carga después. Los valores varían un poco entre corridas.</p>

      <h2 id="metas" style={h2}>Metas cada dos años hasta 2035<Rotulo>Meta</Rotulo></h2>
      <p style={p}>
        Medimos un solo indicador: los <strong>KB evitables por página</strong>, promedio de las seis páginas de la línea base. La ruta baja en línea recta desde la base medida hasta 0 en {r.cierre.anio}, con un hito cada dos años. Grupo MLP S.A.S. fijó estas metas el {fechaLarga(METAS.fijadas)}. Un hito se marcará como cumplido solo cuando la medición lo confirme.
      </p>
      <div style={caja}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
          <thead>
            <tr>
              <th style={th}>Año</th>
              <th style={th}>Avance</th>
              <th style={thN}>KB evitables por página</th>
              <th style={th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {[{ anio: METAS.base.anio, kb: METAS.base.evitableKBPorPagina, estado: 'Línea base medida' }, ...METAS.hitos.map((h) => ({ anio: h.anio, kb: h.evitableKBPorPagina, estado: h.anio === r.cierre.anio ? 'Meta de cierre, pendiente' : 'Meta, pendiente' }))].map((fila) => (
              <tr key={fila.anio}>
                <td style={td}>{fila.anio}</td>
                <td style={{ ...td, width: '40%' }}>
                  <div style={{ height: 10, borderRadius: 999, background: 'var(--bg-hover)' }} aria-hidden="true">
                    <div style={{ height: 10, borderRadius: 999, background: 'var(--color-brand)', width: `${Math.round((fila.kb / METAS.base.evitableKBPorPagina) * 100)}%` }} />
                  </div>
                </td>
                <td style={tdN}>{fmt(fila.kb, fila.kb % 1 === 0 && fila.anio !== METAS.base.anio ? 0 : 1)}</td>
                <td style={td}>{fila.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={nota}>
        Hoy el promedio es {fmt(r.promedioKB)} KB y el próximo hito, {r.proxima.anio}, es {fmt(r.proxima.kb, 0)} KB. Lighthouse puede seguir marcando ahorros pequeños que dependen de las librerías base de la plataforma. Si llegamos a ese límite antes de 2035, lo explicaremos aquí con la medición.
      </p>

      <h2 id="co2" style={h2}>Estimación de CO₂ por visita<Rotulo>Estimado</Rotulo></h2>
      <p style={p}>
        Esta cifra es una estimación, no una medición de nuestros servidores. Usa el modelo Sustainable Web Design versión 4: la energía es el peso transferido en GB por 0,194 kWh (operacional) o por 0,300 kWh (con energía incorporada de los equipos), y las emisiones son esa energía por 494 g CO₂e/kWh, el promedio mundial con datos de Ember de 2022. Corresponde a la primera visita, sin caché.
      </p>
      <div style={caja}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
          <thead>
            <tr>
              <th style={th}>Página</th>
              <th style={thN}>g CO₂e operacional</th>
              <th style={thN}>g CO₂e con energía incorporada</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((x) => (
              <tr key={x.ruta}>
                <td style={td}>{x.ruta}</td>
                <td style={tdN}>{fmt(x.co2gOperacional, 3)}</td>
                <td style={tdN}>{fmt(x.co2gConEnergiaIncorporada, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={nota}>
        Método:{' '}
        <a href="https://sustainablewebdesign.org/calculating-digital-emissions/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-brand)', textDecoration: 'underline' }}>
          sustainablewebdesign.org/calculating-digital-emissions
        </a>
        .
      </p>

      <h2 id="acciones" style={h2}>Qué hacemos para reducirlo</h2>
      <ul style={ul}>
        <li style={li}>Las imágenes usan el formato WebP con el componente de imágenes de Next.js.</li>
        <li style={li}>La página de inicio se genera una vez y se renueva cada 5 minutos, en lugar de calcularse en cada visita.</li>
        <li style={li}>Usamos la fuente Open Sans desde nuestros propios archivos, sin descargar fuentes de terceros.</li>
        <li style={li}>Microsoft Clarity solo se carga si aceptas las cookies analíticas. Google Analytics carga sin cookies hasta que aceptas.</li>
        <li style={li}>Los informes en PDF y las exportaciones a Excel se generan solo cuando los pides.</li>
        <li style={li}>Los registros de actividad de la base de datos se borran solos a los 2 meses.</li>
        <li style={li}>Las funciones del servidor corren en Dublín (dub1), en la misma región que la base de datos (eu-west-1).</li>
      </ul>

      <h2 id="no-medimos" style={h2}>Lo que aún no medimos</h2>
      <ul style={ul}>
        <li style={li}>No tenemos la energía real de los servidores que usamos. Por eso no publicamos kWh ni emisiones totales de la plataforma.</li>
        <li style={li}>No publicamos totales mensuales, porque esta página no tiene el tráfico medido.</li>
        <li style={li}>No publicamos compensaciones de carbono. Primero reducimos lo que se puede evitar.</li>
        <li style={li}>No afirmamos posiciones en rankings de sitios web. Si alguna vez lo hacemos, enlazaremos la herramienta y su resultado.</li>
      </ul>

      <h2 id="verificar" style={h2}>Cómo verificarlo</h2>
      <ol style={{ ...ul, listStyleType: 'decimal' }}>
        <li style={li}>Abre cualquier página pública en Chrome, pulsa F12, entra a la pestaña Lighthouse, elige Móvil y Rendimiento, y pulsa Analizar. Compara el peso total y los ahorros. Puede variar un poco entre corridas.</li>
        <li style={li}>Repite nuestra medición con la herramienta del repositorio, en <code>scripts/medir-verde.mjs</code>.</li>
        <li style={li}>
          Revisa el método de la estimación de CO₂ en{' '}
          <a href="https://sustainablewebdesign.org/calculating-digital-emissions/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-brand)', textDecoration: 'underline' }}>Sustainable Web Design</a>.
        </li>
        <li style={li}>También puedes probar la dirección en <a href="https://www.websitecarbon.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-brand)', textDecoration: 'underline' }}>websitecarbon.com</a>. Puede dar valores distintos porque usa otro método.</li>
      </ol>

      <p style={nota}>Panel de medición ambiental operado por Grupo MLP S.A.S. Todos los derechos reservados.</p>
    </LegalPageLayout>
  )
}
