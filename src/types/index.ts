export type Rol = 'super_admin' | 'empresa_admin' | 'empleado' | 'usuario_libre'
export type Plan = 'free' | 'lab' | 'impulso' | 'ilimitado'
export type NivelConfianza = 'alta' | 'media' | 'baja'
export type TipoAlerta = 'info' | 'promo' | 'estado' | 'urgente'
export type TipoDestinatario = 'todos' | 'empresa' | 'usuario'
export type EstadoInvitacion = 'pendiente' | 'aceptada' | 'expirada'
export type TipoCertificado = 'certificado' | 'informe'
export type TemaPreferido = 'light' | 'dark' | 'system'

export interface Profile {
  id: string
  user_id: string
  nombre: string
  apellido: string | null
  apodo: string | null
  email: string
  rol: Rol
  empresa_id: string | null
  avatar_url: string | null
  tema_preferido: TemaPreferido
  created_at: string
}

export interface Empresa {
  id: string
  nombre: string
  slug: string
  logo_url: string | null
  plan: Plan
  activa: boolean
  sector: string | null
  notas_admin: string | null
  created_at: string
}

export interface Modulo {
  id: string
  nombre: string
  icono_lucide: string
  descripcion: string | null
  activo: boolean
  orden: number
  created_at: string
  updated_at: string
}

export interface ModuloEmpresa {
  id: string
  modulo_id: string
  empresa_id: string
  activo: boolean
  created_at: string
}

export interface ModuloConCategorias extends Modulo {
  categorias: { id: string; nombre: string }[]
  total_empresas: number
}

export interface Categoria {
  id: string
  nombre: string
  icono_lucide: string
  descripcion: string | null
  activa: boolean
  orden: number
  modulo_id: string | null
  created_at: string
}

export interface Item {
  id: string
  categoria_id: string
  nombre: string
  descripcion: string | null
  peso_kg: number
  co2_por_unidad: number
  icono_lucide: string | null
  activo: boolean
  orden: number
  origen_fuente: string | null
  detalle_fuente: string | null
  nivel_confianza: NivelConfianza
  created_at: string
}

export interface Calculo {
  id: string
  user_id: string
  empresa_id: string | null
  fecha: string
  total_co2: number
  total_agua: number
  detalle_json: Record<string, unknown>
  factor_snapshot_json: Record<string, unknown>
  created_at: string
}

export interface Certificado {
  id: string
  tipo: TipoCertificado
  user_id: string | null
  empresa_id: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  co2_total: number
  agua_total: number
  codigo_verificacion: string
  pdf_url: string | null
  metadata_json: Record<string, unknown>
  created_at: string
}

export interface Invitacion {
  id: string
  empresa_id: string
  email: string
  token_hash: string
  estado: EstadoInvitacion
  rol_asignado: Rol
  created_at: string
  expires_at: string
}

export interface Alerta {
  id: string
  titulo: string
  mensaje: string
  tipo: TipoAlerta
  destinatario_tipo: TipoDestinatario
  destinatario_id: string | null
  activa: boolean
  created_at: string
  expires_at: string | null
}

export interface LogAuditoria {
  id: string
  user_id: string | null
  accion: string
  detalle_json: Record<string, unknown>
  ip: string | null
  created_at: string
}

// Tipos compuestos para vistas
export interface ProfileConEmpresa extends Profile {
  empresa: Empresa | null
}

export interface CategoriaConItems extends Categoria {
  items: Item[]
}

export interface EmpresaConStats extends Empresa {
  total_empleados: number
  total_co2: number
}

export interface ModuloConActivo extends Modulo {
  activo_en_empresa: boolean
}

// ── DPP — Pasaporte Digital de Producto ──────────────────────────────────────

export type EstadoDPP = 'activo' | 'en_reuso' | 'disposicion_final' | 'archivado'
export type TipoDocumentoIngesta = 'factura_compra' | 'recibo_energia' | 'certificado_origen' | 'foto_objeto' | 'otro'
export type EstadoOCR = 'pendiente' | 'procesando' | 'completado' | 'error'
export type CategoriaDPP = 'mobiliario' | 'electronico' | 'textil' | 'embalaje' | 'maquinaria' | 'otro'

export interface InputsFinancieros {
  p_virgin_usd_kg: number
  q_circular_kg: number
  c_adquisicion: number
  c_operacion: number
  c_mantenimiento: number
  c_disposicion: number
  v_reventa: number
  m_secundario_kg: number
  m_renovable_kg: number
  m_total_input_kg: number
  n_ciclos: number
  ahorro_operativo?: number
  inversion_ce?: number
  fp_ce?: number
  fp_lineal?: number
  c_impuesto_evitado?: number
  moneda?: 'COP' | 'USD' | 'EUR'
}

export interface ResultadosFinancieros {
  tco: number
  tco_unitario: number
  costo_evitado: number
  e_roi: number
  ice_porcentaje: number
  inflow_circular_pct: number
  desglose: {
    tco_formula: string
    costo_evitado_desglose: {
      ahorro_material: number
      ahorro_disposicion: number
      ahorro_impuesto: number
    }
  }
  narrativa: string
  snapshot: InputsFinancieros & { calculado_at: string; version: string }
}
