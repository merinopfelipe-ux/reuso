// Restaurar la posición del cursor en un input numérico con formato (puntos
// de miles, comas de decimales) que se reescribe por completo en cada tecla.
// Sin esto, React manda el cursor al final del campo apenas cambia el texto
// formateado — así editar un dígito que no está al final termina borrando
// los dígitos siguientes, porque las teclas de después actúan sobre el
// final del número en vez de donde el usuario cree que está escribiendo.

export function contarDigitosAntes(texto: string, posicion: number): number {
  return texto.slice(0, posicion).replace(/\D/g, '').length
}

export function posicionParaNDigitos(textoFormateado: string, nDigitos: number): number {
  if (nDigitos <= 0) return 0
  let contados = 0
  for (let i = 0; i < textoFormateado.length; i++) {
    if (/\d/.test(textoFormateado[i])) {
      contados++
      if (contados === nDigitos) return i + 1
    }
  }
  return textoFormateado.length
}
