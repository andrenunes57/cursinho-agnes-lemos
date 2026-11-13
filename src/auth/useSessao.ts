import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type EstadoSessao = {
  carregando: boolean
  sessao: Session | null
}

/**
 * Sessão atual do Supabase Auth, atualizada a cada login/logout.
 * Provisório da F0: na F2 vira o AuthProvider (sessão + perfil), SPEC §11.
 */
export function useSessao(): EstadoSessao {
  const [estado, setEstado] = useState<EstadoSessao>({ carregando: true, sessao: null })

  useEffect(() => {
    let ativo = true

    supabase.auth.getSession().then(({ data }) => {
      if (ativo) setEstado({ carregando: false, sessao: data.session })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (ativo) setEstado({ carregando: false, sessao })
    })

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [])

  return estado
}
