import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext, chavePerfil, type EstadoAuth, type Perfil } from './contexto'

const COLUNAS_PERFIL = 'id, email, nome_social, pronomes, papel, status, consentimento_em'

async function buscarPerfil(uid: string): Promise<Perfil> {
  const { data, error } = await supabase.from('perfis').select(COLUNAS_PERFIL).eq('id', uid).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Perfil não encontrado.')
  return data
}

/**
 * Sessão do Supabase Auth + perfil da pessoa (SPEC §11). O perfil vem do banco via React Query;
 * nada da conta Google (nome, foto) é lido ou exibido (SPEC §5.4).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [sessao, setSessao] = useState<Session | null>(null)
  const [sessaoCarregada, setSessaoCarregada] = useState(false)

  useEffect(() => {
    let ativo = true

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSessao(data.session)
      setSessaoCarregada(true)
    })

    // Callback síncrono e rápido (recomendação do supabase-js); o perfil é buscado fora dele.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      if (!ativo) return
      setSessao(novaSessao)
      setSessaoCarregada(true)
      if (evento === 'SIGNED_OUT') queryClient.clear()
    })

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [queryClient])

  const uid = sessao?.user.id
  const consultaPerfil = useQuery({
    queryKey: chavePerfil(uid),
    queryFn: () => buscarPerfil(uid as string),
    enabled: Boolean(uid),
  })

  const sair = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const { data: perfil, isPending, isError, refetch } = consultaPerfil
  const valor = useMemo<EstadoAuth>(
    () => ({
      carregando: !sessaoCarregada || (Boolean(uid) && isPending),
      sessao,
      perfil: uid ? (perfil ?? null) : null,
      erroPerfil: Boolean(uid) && isError,
      recarregarPerfil: () => void refetch(),
      sair,
    }),
    [sessaoCarregada, uid, isPending, sessao, perfil, isError, refetch, sair],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
