import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { lerAmbiente } from './ambiente'

const { supabaseUrl, supabaseChavePublica } = lerAmbiente(import.meta.env)

// Fluxo PKCE (SPEC §12.3). Tipado com os tipos gerados do banco (`npm run db:types`; não editar).
export const supabase = createClient<Database>(supabaseUrl, supabaseChavePublica, {
  auth: { flowType: 'pkce' },
})

/** URL para onde o Google/Supabase devolve a pessoa depois do login. */
export function urlDeRetorno(): string {
  return window.location.origin + import.meta.env.BASE_URL
}
