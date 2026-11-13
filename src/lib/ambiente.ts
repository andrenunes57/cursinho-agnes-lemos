export type Ambiente = {
  supabaseUrl: string
  supabaseChavePublica: string
}

type VariaveisBrutas = Partial<Record<'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY', string>>

/**
 * Lê e valida as variáveis públicas do build (SPEC §12.3).
 * Falha cedo, com mensagem clara, em vez de deixar o app quebrar em silêncio.
 */
export function lerAmbiente(env: VariaveisBrutas): Ambiente {
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim()
  const supabaseChavePublica = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!supabaseUrl) {
    throw new Error('Configuração ausente: VITE_SUPABASE_URL.')
  }
  if (!/^https?:\/\//.test(supabaseUrl)) {
    throw new Error('Configuração inválida: VITE_SUPABASE_URL precisa começar com http:// ou https://.')
  }
  if (!supabaseChavePublica) {
    throw new Error('Configuração ausente: VITE_SUPABASE_PUBLISHABLE_KEY.')
  }
  if (supabaseChavePublica.startsWith('sb_secret_')) {
    throw new Error('Configuração perigosa: a chave secreta do Supabase nunca pode ir para o front-end.')
  }

  return { supabaseUrl, supabaseChavePublica }
}
