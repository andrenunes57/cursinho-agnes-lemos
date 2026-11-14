import { Link } from 'react-router'
import { classeLink } from '../../components/LinkExterno'
import { RelatorioFrequencia } from '../../components/RelatorioFrequencia'
import { Carregando } from '../../components/ui/Carregando'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { ordenarTurmas } from '../consultasFrequencia'
import { useTurmas } from './consultas'

/** /coordenacao/frequencia — turma + período → tabela (RF-23) + "Exportar CSV" (RF-24). */
export function Frequencia() {
  const turmas = useTurmas()

  let conteudo
  if (turmas.isPending) {
    conteudo = <Carregando texto="Carregando turmas…" />
  } else if (turmas.isError) {
    conteudo = <ErroComRetry mensagem="Não foi possível carregar as turmas." onTentarDeNovo={() => void turmas.refetch()} />
  } else if (turmas.data.length === 0) {
    conteudo = (
      <EmptyState titulo="Nenhuma turma cadastrada">
        <p>
          Para ver a frequência, primeiro{' '}
          <Link to="/coordenacao/turmas" className={classeLink}>
            cadastre uma turma
          </Link>
          .
        </p>
      </EmptyState>
    )
  } else {
    conteudo = <RelatorioFrequencia turmas={ordenarTurmas(turmas.data)} exportar />
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Frequência</h1>
      {conteudo}
    </>
  )
}
