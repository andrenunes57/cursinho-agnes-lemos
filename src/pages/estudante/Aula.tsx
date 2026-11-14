import { Link, useParams } from 'react-router'
import { MaterialItem } from '../../components/MaterialItem'
import { Carregando } from '../../components/ui/Carregando'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { formatarQuando } from '../../lib/datas'
import { useAula, useMateriais, useNomeDocente } from '../consultasAulas'

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

/** /aulas/:id — dados da aula + materiais publicados (as tarefas entram na F5). */
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
