import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Usuario autenticado de la petición actual. React.cache comparte el resultado
// entre el layout y la página de la misma carga, así que getUser() (que viaja
// al servidor de autenticación) se hace una sola vez en vez de una por cada uno.
// La verificación es la misma de siempre: getUser(), no se confía en la cookie.
export const obtenerUsuario = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
})
