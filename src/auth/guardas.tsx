import { Navigate, Outlet, useLocation } from 'react-router'
import { Carregando } from '../components/ui/Carregando'
import { ErroComRetry } from '../components/ui/ErroComRetry'
import { PaginaSimples } from '../components/PaginaSimples'
import type { Enums } from '../types/database'
import { destinoDoPerfil, useAuth } from './contexto'

// Guardas de rota (SPEC §11). São só UX: quem protege os dados é a RLS do banco (§9).

function TelaDeEspera() {
  return (
    <PaginaSimples>
      <Carregando />
    </PaginaSimples>
  )
}

/** 1. Sem sessão → /entrar, levando junto `?error=` e `#…` do retorno do OAuth (RF-01). */
export function RequireSessao() {
  const { carregando, sessao, erroPerfil, recarregarPerfil } = useAuth()
  const { search, hash } = useLocation()

  if (carregando) return <TelaDeEspera />
  if (!sessao) return <Navigate to={{ pathname: '/entrar', search, hash }} replace />
  if (erroPerfil) {
    return (
      <PaginaSimples>
        <ErroComRetry mensagem="Não foi possível carregar seu perfil." onTentarDeNovo={recarregarPerfil} />
      </PaginaSimples>
    )
  }
  return <Outlet />
}

/** 2 e 3. Sem onboarding → /primeiro-acesso; não ativo → /aguardando. */
export function RequireStatus() {
  const { perfil } = useAuth()
  if (!perfil) return <TelaDeEspera />
  const destino = destinoDoPerfil(perfil)
  return destino ? <Navigate to={destino} replace /> : <Outlet />
}

/** 4. Papel incompatível → Início. */
export function RequirePapel({ papeis }: { papeis: readonly Enums<'papel_usuario'>[] }) {
  const { perfil } = useAuth()
  if (!perfil) return <TelaDeEspera />
  return papeis.includes(perfil.papel) ? <Outlet /> : <Navigate to="/" replace />
}
