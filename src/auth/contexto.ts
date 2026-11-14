import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { Tables } from '../types/database'

export type Perfil = Pick<
  Tables<'perfis'>,
  'id' | 'email' | 'nome_social' | 'pronomes' | 'papel' | 'status' | 'consentimento_em'
>

export type EstadoAuth = {
  /** true enquanto a sessão (e, havendo sessão, o perfil) ainda não foi carregada. */
  carregando: boolean
  sessao: Session | null
  perfil: Perfil | null
  /** Falha ao ler o perfil (rede, RLS…). As telas mostram "Tentar de novo". */
  erroPerfil: boolean
  recarregarPerfil: () => void
  sair: () => Promise<void>
}

/** Chave do React Query para o perfil da pessoa logada. */
export function chavePerfil(uid: string | undefined) {
  return ['perfil', uid] as const
}

export const AuthContext = createContext<EstadoAuth | null>(null)

export function useAuth(): EstadoAuth {
  const valor = useContext(AuthContext)
  if (!valor) throw new Error('useAuth precisa estar dentro do <AuthProvider>.')
  return valor
}

/** O onboarding (RF-02) termina quando há nome social e consentimento registrado. */
export function concluiuOnboarding(perfil: Perfil): boolean {
  return Boolean(perfil.nome_social) && Boolean(perfil.consentimento_em)
}

/**
 * Para onde a pessoa logada deve ir, conforme o perfil (SPEC §11, guardas 2 e 3).
 * null = pode acessar a área ativa.
 */
export function destinoDoPerfil(perfil: Perfil): '/primeiro-acesso' | '/aguardando' | null {
  if (!concluiuOnboarding(perfil)) return '/primeiro-acesso'
  if (perfil.status !== 'ativo') return '/aguardando'
  return null
}

/** "Nome (pronomes)" para o cabeçalho e telas de perfil. Nunca usa dados do Google. */
export function nomeComPronomes(perfil: Pick<Perfil, 'nome_social' | 'pronomes'>): string {
  const nome = perfil.nome_social ?? ''
  return perfil.pronomes ? `${nome} (${perfil.pronomes})` : nome
}
