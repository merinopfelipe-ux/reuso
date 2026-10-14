import { describe, it, expect } from 'vitest'
import {
  rutaEmpresa,
  carpetaEmpresa,
  rutaInformeUsuario,
  carpetasDeBorradoPorBucket,
  empresaDueniaDeRuta,
  rutaSegura,
  rutaNuevaDesdeLegada,
  rutaDesdeUrl,
} from './empresa-rutas'

const E = '11111111-1111-4111-8111-111111111111'
const OTRA = '22222222-2222-4222-8222-222222222222'
const U = '33333333-3333-4333-8333-333333333333'

describe('rutas nuevas', () => {
  it('construye la ruta bajo empresas/<id>/<área>/', () => {
    expect(rutaEmpresa(E, 'cotizador', 'a.webp')).toBe(`empresas/${E}/cotizador/a.webp`)
    expect(rutaEmpresa(E, 'dppImagenes', 'b.webp')).toBe(`empresas/${E}/dpp/imagenes/b.webp`)
    expect(rutaEmpresa(E, 'informes', 'x.pdf')).toBe(`empresas/${E}/informes/x.pdf`)
    expect(rutaEmpresa(E, 'logoEmpresa', 'l.png')).toBe(`empresas/${E}/logos/empresa/l.png`)
  })

  it('rechaza nombres con carpetas o subida de nivel', () => {
    expect(() => rutaEmpresa(E, 'cotizador', '../otra/x.webp')).toThrow()
    expect(() => rutaEmpresa(E, 'cotizador', 'sub/x.webp')).toThrow()
  })

  it('los informes personales van a usuarios/<id>/informes', () => {
    expect(rutaInformeUsuario(U, 'i.pdf')).toBe(`usuarios/${U}/informes/i.pdf`)
  })

  it('la carpeta de la empresa termina en /', () => {
    expect(carpetaEmpresa(E)).toBe(`empresas/${E}/`)
  })
})

describe('carpetas de borrado', () => {
  it('incluye la carpeta nueva y las legadas de cada bucket', () => {
    const lista = carpetasDeBorradoPorBucket(E)
    expect(lista).toContainEqual({ bucket: 'logos', prefijo: `empresas/${E}/` })
    expect(lista).toContainEqual({ bucket: 'logos', prefijo: `logos-admin/${E}/` })
    expect(lista).toContainEqual({ bucket: 'cotizador', prefijo: `cotizador/${E}/` })
    expect(lista).toContainEqual({ bucket: 'dpp', prefijo: `dpp/ingestas/${E}/` })
    expect(lista).toContainEqual({ bucket: 'documentos', prefijo: `informes/empresa/${E}/` })
  })
})

describe('dueño de una ruta', () => {
  it('reconoce la empresa dueña en rutas nuevas y legadas', () => {
    expect(empresaDueniaDeRuta(`empresas/${E}/cotizador/a.webp`)).toBe(E)
    expect(empresaDueniaDeRuta(`cotizador/${E}/a.webp`)).toBe(E)
    expect(empresaDueniaDeRuta(`propuesta-logos/${E}/a.png`)).toBe(E)
  })

  it('no reconoce dueña para rutas sin id de empresa', () => {
    expect(empresaDueniaDeRuta(`dpp/imagenes/foto-123.webp`)).toBeNull()
    expect(empresaDueniaDeRuta(`logos/1700000000.png`)).toBeNull()
  })

  it('una ruta de OTRA empresa nunca es segura para borrar', () => {
    expect(rutaSegura(`empresas/${OTRA}/cotizador/a.webp`, E)).toBe(false)
    expect(rutaSegura(`cotizador/${OTRA}/a.webp`, E)).toBe(false)
    expect(rutaSegura(`empresas/${E}/cotizador/a.webp`, E)).toBe(true)
    expect(rutaSegura(`dpp/imagenes/foto.webp`, E)).toBe(true)
  })
})

describe('rutas legadas a nuevas', () => {
  it('traduce cada carpeta legada a su carpeta nueva', () => {
    expect(rutaNuevaDesdeLegada(`logos-admin/${E}/x.svg`, E)?.hacia).toBe(`empresas/${E}/logos/admin/x.svg`)
    expect(rutaNuevaDesdeLegada(`propuesta-logos/${E}/x.png`, E)?.hacia).toBe(`empresas/${E}/logos/propuesta/x.png`)
    expect(rutaNuevaDesdeLegada(`cotizador/${E}/x.webp`, E)?.hacia).toBe(`empresas/${E}/cotizador/x.webp`)
    expect(rutaNuevaDesdeLegada(`dpp/ingestas/${E}/act/f.txt`, E)?.hacia).toBe(`empresas/${E}/dpp/ingestas/act/f.txt`)
    expect(rutaNuevaDesdeLegada(`informes/empresa/${E}/i.pdf`, E)?.hacia).toBe(`empresas/${E}/informes/i.pdf`)
  })

  it('no traduce rutas de otra empresa ni rutas sin carpeta de empresa', () => {
    expect(rutaNuevaDesdeLegada(`cotizador/${OTRA}/x.webp`, E)).toBeNull()
    expect(rutaNuevaDesdeLegada(`dpp/imagenes/x.webp`, E)).toBeNull()
  })
})

describe('extraer ruta de una URL de Storage', () => {
  it('lee bucket y ruta de una URL pública', () => {
    const url = `https://x.supabase.co/storage/v1/object/public/logos/propuesta-logos/${E}/a%20b.png`
    expect(rutaDesdeUrl(url)).toEqual({ bucket: 'logos', path: `propuesta-logos/${E}/a b.png` })
  })

  it('lee bucket y ruta de una URL firmada, sin el query', () => {
    const url = `https://x.supabase.co/storage/v1/object/sign/dpp/dpp/imagenes/f.webp?token=abc`
    expect(rutaDesdeUrl(url)).toEqual({ bucket: 'dpp', path: 'dpp/imagenes/f.webp' })
  })

  it('devuelve null para una ruta simple o una URL externa', () => {
    expect(rutaDesdeUrl(`empresas/${E}/cotizador/a.webp`)).toBeNull()
    expect(rutaDesdeUrl('https://ejemplo.com/logo.png')).toBeNull()
  })
})
