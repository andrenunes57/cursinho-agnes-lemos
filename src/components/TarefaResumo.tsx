import { formatarDataHora, prazoEncerrado } from '../lib/datas'
import { ROTULO_AVALIACAO, type Tarefa } from '../pages/consultasTarefas'
import { TextoComLinks } from './LinkExterno'

/** Prazo, tipo de avaliação e instruções de uma tarefa (estudante e docente). */
export function TarefaResumo({ tarefa, mostrarInstrucoes = true }: { tarefa: Tarefa; mostrarInstrucoes?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="font-semibold">Prazo</dt>
        <dd>
          {tarefa.prazo ? formatarDataHora(tarefa.prazo) : 'Sem prazo'}
          {prazoEncerrado(tarefa.prazo) && <span className="text-texto-suave"> (encerrado)</span>}
        </dd>
        <dt className="font-semibold">Avaliação</dt>
        <dd>
          {ROTULO_AVALIACAO[tarefa.tipo_avaliacao]}
          {tarefa.tipo_avaliacao === 'conceito' && tarefa.opcoes_conceito && `: ${tarefa.opcoes_conceito.join(', ')}`}
        </dd>
      </dl>
      {mostrarInstrucoes && tarefa.instrucoes && <TextoComLinks texto={tarefa.instrucoes} />}
    </div>
  )
}
