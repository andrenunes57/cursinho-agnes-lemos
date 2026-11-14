import { Navigate } from 'react-router'
import { destinoDoPerfil, useAuth } from '../../auth/contexto'
import { PaginaSimples } from '../../components/PaginaSimples'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

/** /aguardando — pessoa `pendente` ou `inativo` vê só isto, o próprio perfil e "Sair" (RF-03). */
export function Aguardando() {
  const { perfil, sair, recarregarPerfil } = useAuth()

  if (!perfil) return null
  const destino = destinoDoPerfil(perfil)
  if (destino !== '/aguardando') return <Navigate to={destino ?? '/'} replace />

  const inativo = perfil.status === 'inativo'

  return (
    <PaginaSimples>
      {inativo ? (
        <>
          <h1 className="text-3xl font-bold text-marca">Acesso desativado</h1>
          <p>Seu acesso ao sistema está desativado. Se achar que é um engano, fale com a coordenação do cursinho.</p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold text-marca">Cadastro recebido!</h1>
          <p>
            Que bom ter você por aqui. A coordenação do cursinho vai conferir o seu cadastro e liberar o acesso em
            breve. Depois disso, é só entrar de novo.
          </p>
        </>
      )}

      <Card>
        <h2 className="mb-2 text-lg font-bold">Seus dados</h2>
        <dl className="grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-4">
          <dt className="font-semibold">Nome social</dt>
          <dd>{perfil.nome_social}</dd>
          <dt className="font-semibold">Pronomes</dt>
          <dd>{perfil.pronomes ?? 'Não informados'}</dd>
          <dt className="font-semibold">E-mail</dt>
          <dd className="break-all">{perfil.email}</dd>
        </dl>
      </Card>

      <div className="flex flex-wrap gap-3">
        {!inativo && (
          <Button variante="secundario" onClick={recarregarPerfil}>
            Verificar de novo
          </Button>
        )}
        <Button onClick={() => void sair()}>Sair</Button>
      </div>
    </PaginaSimples>
  )
}
