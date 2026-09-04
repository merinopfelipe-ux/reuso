import { redirect } from 'next/navigation'

// /admin/planes se fusionó dentro de /admin/contenido (pestaña "Precios")
// a pedido del usuario 2026-09-04. Se deja este redirect (en vez de borrar
// la ruta) por si queda algún enlace o marcador viejo apuntando aquí —
// mismo criterio ya usado para /admin/configuracion → /admin/plantillas.
export default function PlanesPage() {
  redirect('/admin/contenido')
}
