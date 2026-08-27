// Reglas de longitud de celular por indicativo — SOLO para países con dato
// verificado, para no bloquear a nadie con una regla inventada. Hoy el
// negocio real opera únicamente en Colombia (ver skill modelo-negocio-reuso
// y Etapa 2 del plan de escalabilidad), así que es la única regla dura.
// Agregar otro país aquí requiere confirmar su formato real, no adivinarlo.
const REGLA_POR_INDICATIVO: Record<string, { digitos: number; empiezaCon?: string; pais: string }> = {
  '+57': { digitos: 10, empiezaCon: '3', pais: 'Colombia' },
}

/** null si es válido, o el mensaje de error a mostrar. */
export function validarTelefono(telefono: string, indicativo: string): string | null {
  const soloDigitos = telefono.replace(/\D/g, '')
  const regla = REGLA_POR_INDICATIVO[indicativo]
  if (!regla) return null // sin regla verificada para este indicativo todavía

  if (soloDigitos.length !== regla.digitos) {
    return `El celular de ${regla.pais} debe tener exactamente ${regla.digitos} dígitos.`
  }
  if (regla.empiezaCon && !soloDigitos.startsWith(regla.empiezaCon)) {
    return `El celular de ${regla.pais} debe empezar en ${regla.empiezaCon}.`
  }
  return null
}

export function formatTelefonoVista(telefono: string | null | undefined, indicativo: string | null | undefined): string {
  if (!telefono) return ''
  const ind = indicativo || '+57'
  const soloDigitos = telefono.replace(/\D/g, '')
  
  if (ind === '+57' && soloDigitos.length === 10) {
    return `${ind} (${soloDigitos.slice(0, 3)}) ${soloDigitos.slice(3, 6)} ${soloDigitos.slice(6)}`
  }
  
  return `${ind} ${soloDigitos}`
}
