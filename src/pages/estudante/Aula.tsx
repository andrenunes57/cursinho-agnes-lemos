import { Link, useParams } from 'react-router'
import { CartaoTarefa } from '../../components/CartaoTarefa'
import { MaterialItem } from '../../components/MaterialItem'
import { Carregando } from '../../components/ui/Carregando'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { formatarQuando } from '../../lib/datas'
import { useAula, useMateriais, useNomeDocente } from '../consultasAulas'
import { situacaoDaEntrega, useTarefasDaAula } from '../consultasTarefas'

const classeLink = 'font-semibold text-marca underline underline-offset-4'

/** Materiais publicados da aula. A RLS já esconde os rascunhos (RF-12/RF-13). */
function Materiais({ aulaId }: { aulaId: string }) {
  const materiais = useMateriais(aulaId)
  if (materiais.isPending) return <Carregando texto="Carregando materiais…" />
  if (materiais.isError) {
    return <ErroComRetry mensagem="Não foi possível carregar os materiais." onTentarDeNovo={() => void materiais.refetch()} />
  }
  if (materiais.data.length === 0) {
    return (
      <EmptyState titulo="Nenhum material publicado ainda">
        <p>Quando a pessoa docente publicar os materiais desta aula, eles aparecem aqui.</p>
      </EmptyState>
    )
  }
  return (
    <ol className="flex flex-col gap-3">
      {materiais.data.map((m) => (
        <li key={m.id}>
          <MaterialItem material={m} />
        </li>
      ))}
    </ol>
  )
}

/** Tarefas publicadas da aula, com a situação da própria entrega (a RLS esconde rascunhos e entregas alheias). */
function Tarefas({ aulaId }: { aulaId: string }) {
  const tarefas = useTarefasDaAula(aulaId)
  if (tarefas.isPending) return <Carregando texto="Carregando tarefas…" />
  if (tarefas.isError) {
    return <ErroComRetry mensagem="Não foi possível carregar as tarefas." onTentarDeNovo={() => void tarefas.refetch()} />
  }
  if (tarefas.data.length === 0) return <EmptyState titulo="Nenhuma tarefa nesta aula" />
  return (
    <ul className="flex flex-col gap-3">
      {tarefas.data.map((t) => (
        <li key={t.id}>
          <CartaoTarefa tarefa={t} situacao={situacaoDaEntrega(t.entregas[0], t.prazo)} />
        </li>
      ))}
    </ul>
  )
}

/** /aulas/:id — dados da aula + materiais e tarefas publicados (SPEC §11). */
export function Aula() {
  const { id } = useParams()
  const aula = useAula(id)
  const nomeDocente = useNomeDocente()

  let conteudo
  if (aula.isPending) {
    conteudo = <Carregando texto="Carregando aula…" />
  } else if (aula.isError) {
    conteudo = <ErroComRetry mensagem="Não foi possível carregar a aula." onTentarDeNovo={() => void aula.refetch()} />
  } else if (!aula.data) {
    conteudo = (
      <EmptyState titulo="Aula não encontrada">
        <p>
          Ela pode ter sido excluída ou não ser da sua turma.{' '}
          <Link to="/aulas" className={classeLink}>
            Ver suas aulas
          </Link>
        </p>
      </EmptyState>
    )
  } else {
    const a = aula.data
    conteudo = (
      <>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="font-semibold">Quando</dt>
          <dd>{formatarQuando(a.data, a.inicio)}</dd>
          <dt className="font-semibold">Disciplina</dt>
          <dd>{a.disciplina}</dd>
          <dt className="font-semibold">Docente</dt>
          <dd>{nomeDocente(a.professor_id)}</dd>
        </dl>
        <section aria-labelledby="titulo-materiais" className="flex flex-col gap-3">
          <h2 id="titulo-materiais" className="text-xl font-semibold">
            Materiais
          </h2>
          <Materiais aulaId={a.id} />
        </section>
        <section aria-labelledby="titulo-tarefas" className="flex flex-col gap-3">
          <h2 id="titulo-tarefas" className="text-xl font-semibold">
            Tarefas
          </h2>
          <Tarefas aulaId={a.id} />
        </section>
      </>
    )
  }

  return (
    <>
      <p>
        <Link to="/aulas" className={classeLink}>
          <span aria-hidden="true">← </span>Aulas
        </Link>
      </p>
      <h1 className="text-3xl font-bold break-words text-marca">{aula.data?.titulo ?? 'Aula'}</h1>
      {conteudo}
    </>
  )
}
