import { redirect } from 'next/navigation'

// El enlace público abierto de firma se retiró: ahora la firma del Acuerdo de
// Confidencialidad solo se hace por invitación cerrada y de un solo uso,
// generada por el super_admin en /admin/firmas (ver /legal/firma/[token]).
// Esta ruta se conserva solo para no romper enlaces antiguos ya compartidos,
// y redirige al texto legal de solo lectura.
export default function ConfidencialidadFirmaPage() {
  redirect('/legal/confidencialidad')
}
