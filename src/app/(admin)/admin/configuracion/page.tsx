import { redirect } from 'next/navigation'

// El único campo real de esta pantalla (correo de notificaciones) se movió a
// /admin/plantillas — esta ruta se deja como redirect en vez de borrarla
// porque el enlace del sidebar todavía apunta aquí (sidebar.tsx es zona
// protegida, requiere la clave del usuario para tocarlo).
export default function ConfiguracionSistemaPage() {
  redirect('/admin/plantillas')
}
