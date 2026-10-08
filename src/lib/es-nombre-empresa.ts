const PATRON_EMPRESA = /\b(s\.?a\.?s\.?|s\.?a\.?|ltda\.?|e\.?u\.?|srl|llc|corp|inc|nv|bv|gmbh|grupo|group|empresa|compañia|compa[ñn]ia|cia\.?|asociaci[oó]n|asoc\.?|fundaci[oó]n|fund\.?|cooperativa|coop\.?|holding|industrias|industries|solutions|soluciones|hermanos|hnos\.?|asociados|asesores|constructora|inmobiliaria|inmuebles|inversiones|arquitectura|studios?|agencia|agency|consultores|consultor[ií]a|dise[ñn]o|proyectos|proveedores|distribuidora|comercializadora|representaciones)\b/i

export function esNombreDeEmpresa(nombre: string): boolean {
  return PATRON_EMPRESA.test(nombre.trim())
}
