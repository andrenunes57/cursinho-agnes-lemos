import { Link, Navigate } from 'react-router'
import { useAuth } from '../../auth/contexto'
import { classeLink } from '../../components/LinkExterno'
import { RelatorioFrequencia } from '../../components/RelatorioFrequencia'
import { Carregando } from '../../components/ui/Carregando'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { useTurmasDoDocente } from '../consultasFrequencia'

/** /docente/frequencia — relatório (RF-23) restrito às próprias aulas; a RPC aplica o escopo. */
export function FrequenciaDocente() {
  const { perfil } = useAuth()
  const ehCoordenacao = perfil?.papel === 'coordenacao'
  const turmas = useTurmasDoDocente(ehCoordenacao ? undefined : perfil?.id)

  // Para a coordenação, a RPC considera todas as aulas da turma: o relatório certo é o dela.
  if (ehCoordenacao) return <Navigate to="/coordenacao/frequencia" replace />

  let conteudo
  if (turmas.isPending) {
    conteudo = <Carregando texto="Carregando suas turmas…" />
  } else if (turmas.isError) {
    conteudo = <ErroComRetry mensagem="Não foi possível carregar suas turmas." onTentarDeNovo={() => void turmas.refetch()} />
  } else if (turmas.data.length === 0) {
    conteudo = (
      <EmptyState titulo="Você ainda não tem aulas">
        <p>
          O relatório aparece quando você tiver aulas com chamada.{' '}
          <Link to="/docente/aulas" className={classeLink}>
            Ir para minhas aulas
          </Link>
        </p>
      </EmptyState>
    )
  } else {
    conteudo = (
      <>
        <p>O relatório considera só as aulas que você dá.</p>
        <RelatorioFrequencia turmas={turmas.data} />
      </>
    )
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Frequência das minhas aulas</h1>
      {conteudo}
    </>
  )
}
