import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Usuario autenticado de la petición actual, para layouts y páginas que solo
// leen. React.cache comparte el resultado entre el layout y la página de la
// misma carga.
//
// Usa getClaims(): verifica la firma del token con la clave pública (ES256, en
// caché) sin viajar al servidor de autenticación. Una sesión revocada sigue
// valiendo hasta que venza su token (máximo 1 hora). Las rutas de API que
// escriben o cambian datos siguen usando getUser(), que sí consulta al servidor.
export const obtenerUsuario = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const user = claims?.sub
    ? { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : undefined }
    : null
  return { supabase, user }
})
