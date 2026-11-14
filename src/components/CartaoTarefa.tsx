import { Link } from 'react-router'
import { formatarDataHora, formatarDiaMes, prazoEncerrado } from '../lib/datas'
import { ROTULO_SITUACAO, TOM_SITUACAO, type Situacao, type Tarefa } from '../pages/consultasTarefas'
import { Etiqueta } from './ui/Etiqueta'

type Props = {
  tarefa: Pick<Tarefa, 'id' | 'titulo' | 'prazo'>
  situacao: Situacao
  /** Aula de origem (lista geral de tarefas). */
  aula?: { titulo: string; data: string; disciplina: string }
}

/** Cartão de tarefa da estudante; o título é o link para /tarefas/:id. */
export function CartaoTarefa({ tarefa, situacao, aula }: Props) {
  const encerrado = situacao === 'pendente' && prazoEncerrado(tarefa.prazo)
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 text-lg font-semibold break-words">
          <Link to={`/tarefas/${tarefa.id}`} className="text-marca underline underline-offset-4 hover:text-marca-escura">
            {tarefa.titulo}
          </Link>
        </h3>
        <Etiqueta tom={TOM_SITUACAO[situacao]}>{ROTULO_SITUACAO[situacao]}</Etiqueta>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="font-semibold">Prazo</dt>
        <dd>
          {tarefa.prazo ? formatarDataHora(tarefa.prazo) : 'Sem prazo'}
          {encerrado && <span className="font-semibold text-erro"> (encerrado; ainda dá para entregar)</span>}
        </dd>
        {aula && (
          <>
            <dt className="font-semibold">Aula</dt>
            <dd className="min-w-0 break-words">
              {aula.disciplina} · {aula.titulo} ({formatarDiaMes(aula.data)})
            </dd>
          </>
        )}
      </dl>
    </article>
  )
}
