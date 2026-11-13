import { createClient } from '@supabase/supabase-js'
import { lerAmbiente } from './ambiente'

const { supabaseUrl, supabaseChavePublica } = lerAmbiente(import.meta.env)

// Fluxo PKCE (SPEC §12.3). Na F1 o cliente passa a ser tipado com os tipos gerados do banco.
export const supabase = createClient(supabaseUrl, supabaseChavePublica, {
  auth: { flowType: 'pkce' },
})

/** URL para onde o Google/Supabase devolve a pessoa depois do login. */
export function urlDeRetorno(): string {
  return window.location.origin + import.meta.env.BASE_URL
}
