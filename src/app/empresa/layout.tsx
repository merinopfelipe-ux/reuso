import '../globals.css'

// Solo carga el CSS de la app completa para estas rutas (la raíz ya no lo
// importa: la landing usa su propio publica.css).
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
