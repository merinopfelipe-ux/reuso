import crypto from 'crypto'
import { encryptSensitive, decryptSensitive } from '@/lib/encryption.server'

type ConTelefono = { telefono?: string | null; telefonos_extra?: unknown }

export function huellaTelefono(indicativo: string | null | undefined, numero: string | null | undefined): string | null {
  const numeroDigitos = (numero ?? '').replace(/\D/g, '')
  if (!numeroDigitos) return null
  const digitos = `${(indicativo ?? '').replace(/\D/g, '')}${numeroDigitos}`
  const clave = process.env.TELEFONO_HASH_KEY
  if (!clave || clave.length < 32) throw new Error('TELEFONO_HASH_KEY ausente o menor de 32 caracteres.')
  return crypto.createHmac('sha256', clave).update(digitos).digest('hex')
}

export async function guardarTelefono(indicativo: string | null | undefined, numero: string | null | undefined) {
  if (!numero) return { telefono: null, telefono_hash: null }
  return { telefono: await encryptSensitive(numero), telefono_hash: huellaTelefono(indicativo, numero) }
}

export async function guardarTelefonosExtra(lista: { indicativo: string; numero: string }[] | undefined | null): Promise<string | never[]> {
  if (!lista || lista.length === 0) return []
  return (await encryptSensitive(JSON.stringify(lista))) ?? []
}

export async function leerTelefonosExtra(valor: unknown): Promise<{ indicativo: string; numero: string }[]> {
  if (Array.isArray(valor)) return valor
  if (typeof valor !== 'string') return []
  const txt = await decryptSensitive(valor)
  try {
    const lista = JSON.parse(txt ?? '[]')
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

export const leerTelefono = (valor: string | null | undefined) => decryptSensitive(valor ?? null)

export async function legibleCliente<T extends ConTelefono>(cliente: T): Promise<T> {
  const extra = cliente.telefonos_extra !== undefined ? { telefonos_extra: await leerTelefonosExtra(cliente.telefonos_extra) } : {}
  return { ...cliente, telefono: await leerTelefono(cliente.telefono), ...extra }
}

export function legiblesClientes<T extends ConTelefono>(lista: T[]): Promise<T[]> {
  return Promise.all(lista.map(legibleCliente))
}
