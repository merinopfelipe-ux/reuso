import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

const SECCIONES = [
  { id: 'que-medimos', label: '¿Qué medimos?' },
  { id: 'como-calculamos', label: '¿Cómo calculamos?' },
  { id: 'seguridad', label: 'Seguridad digital' },
  { id: 'por-que-importa', label: '¿Por qué importa?' },
  { id: 'limitaciones', label: 'Limitaciones' },
]

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Cómo medimos tu impacto',
}

const h2: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  marginTop: 40,
  marginBottom: 12,
  color: 'var(--text-primary)',
}
const p: React.CSSProperties = { marginBottom: 16, lineHeight: 1.85 }
const ul: React.CSSProperties = { paddingLeft: 20, marginBottom: 16, listStyleType: 'disc' }
const li: React.CSSProperties = { marginBottom: 8 }

export default function MedicionPage() {
  return (
    <LegalPageLayout
      titulo="¿Cómo medimos tu impacto?"
      breadcrumbLabel="Metodología de cálculo"
      secciones={SECCIONES}
      resumen="Calculamos el CO₂ equivalente que evitas cada vez que reutilizas un objeto en lugar de comprar uno nuevo. Usamos factores de emisión reconocidos internacionalmente. Los cálculos son inmutables y verificables con un código QR único. Esta metodología es propiedad intelectual de Grupo MLP S.A.S. y no puedes reproducirla sin autorización."
      leeTabien={[
        { href: '/legal/reglamento', label: 'Reglamento de Uso' },
        { href: '/legal/confidencialidad', label: 'Confidencialidad' },
        { href: '/legal/terminos', label: 'Términos y Condiciones' },
      ]}
    >
      {/* IP notice */}
      <p
        style={{
          ...p,
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          marginBottom: 32,
        }}
      >
        El contenido de esta página, la metodología y los factores de emisión empleados
        constituyen propiedad intelectual de Grupo MLP S.A.S. Queda prohibida su reproducción,
        extracción o uso sin autorización expresa y escrita. Para más detalles, consulta el{' '}
        <Link
          href="/legal/confidencialidad"
          style={{ color: 'var(--color-brand)', fontWeight: 600 }}
        >
          acuerdo de confidencialidad
        </Link>
        .
      </p>

      <h2 id="que-medimos" style={{ ...h2, marginTop: 0 }}>¿Qué medimos?</h2>
      <p style={p}>
        Medimos el CO₂ equivalente (CO₂e) que se evita cuando un objeto, como ropa, mueble,
        electrónico o herramienta, continúa en uso en lugar de ser descartado y reemplazado
        por uno nuevo.
      </p>
      <p style={p}>
        Cada vez que registras un objeto, la plataforma estima cuánto CO₂ habrías emitido si
        hubieras adquirido ese mismo objeto nuevo. Esa diferencia constituye tu impacto positivo
        y el valor que certificamos.
      </p>

      <h2 id="como-calculamos" style={h2}>¿Cómo calculamos?</h2>
      <p style={p}>
        Para cada categoría de objeto (ropa, madera, metal, plástico, electrónicos, entre otras)
        empleamos factores de emisión basados en estudios de ciclo de vida (ACV) reconocidos
        internacionalmente. Estos factores expresan el CO₂e por unidad de peso (kg).
      </p>
      <p style={p}>
        El cálculo toma como dato de entrada la categoría y el peso del objeto registrado, y
        aplica el factor correspondiente para obtener el CO₂e evitado. Los factores se fijan en
        el momento del cálculo y permanecen inmutables, de modo que los certificados históricos
        permanecen siempre reproducibles y verificables.
      </p>
      <p style={p}>
        Los resultados se expresan en kilogramos de CO₂ equivalente (kg CO₂e). En grandes
        volúmenes también se presentan en toneladas (t CO₂e).
      </p>

      <h2 id="seguridad" style={h2}>Seguridad y Sellos Digitales</h2>
      <p style={p}>
        La plataforma asigna un sello digital único (Hash criptográfico) a cada registro. Este
        sello funciona como una huella dactilar que identifica el cálculo y lo conecta
        matemáticamente con el registro anterior, creando una cadena de seguridad que protege
        toda la información.
      </p>
      <p style={p}>
        El sistema garantiza que los resultados de los certificados permanezcan intactos. Si
        alguien intentara modificar un dato en los registros, la cadena de seguridad se rompe
        de inmediato, invalidando la verificación pública de los documentos.
      </p>

      <h2 id="por-que-importa" style={h2}>¿Por qué importa?</h2>
      <p style={p}>
        La economía circular propone que los objetos mantengan su valor el mayor tiempo posible.
        Cada objeto que reutilizas evita la extracción de materias primas, el consumo de energía
        del proceso productivo y las emisiones del transporte asociado a fabricar uno nuevo.
      </p>
      <p style={p}>
        Al certificar ese impacto, te entregamos un lenguaje común para comunicarlo: en
        reuniones de equipo, en reportes de sostenibilidad o al compartir tu compromiso con el
        planeta.
      </p>

      <h2 id="limitaciones" style={h2}>Limitaciones del estimado</h2>
      <p style={p}>Somos transparentes sobre lo que el cálculo todavía no incluye:</p>
      <ul style={ul}>
        <li style={li}>
          Los factores de emisión son promedios sectoriales y difieren de los valores específicos
          de cada fabricante.
        </li>
        <li style={li}>
          El cálculo excluye el impacto del transporte o almacenamiento del objeto reutilizado.
        </li>
        <li style={li}>
          Los certificados difieren de créditos de carbono certificados por organismos
          internacionales de verificación.
        </li>
        <li style={li}>
          La metodología puede actualizarse a medida que se publiquen nuevos estudios. Los
          cálculos históricos conservan siempre el factor original.
        </li>
      </ul>
      <p style={p}>
        Los certificados de la calculadora son una herramienta de comunicación y educación
        ambiental. Para conocer las condiciones completas de uso, consulta el{' '}
        <Link href="/legal/reglamento" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          reglamento de uso
        </Link>
        .
      </p>
    </LegalPageLayout>
  )
}
