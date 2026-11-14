import { useAuth } from '../../auth/contexto'
import { CartaoTarefa } from '../../components/CartaoTarefa'
import { Abas } from '../../components/ui/Abas'
import { Carregando } from '../../components/ui/Carregando'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { porPrazo, situacaoDaEntrega, useMinhasTarefas, type MinhaTarefa, type Situacao } from '../consultasTarefas'

const ABAS = [
  { id: 'pendentes', rotulo: 'Pendentes' },
  { id: 'enviadas', rotulo: 'Enviadas' },
  { id: 'avaliadas', rotulo: 'Avaliadas' },
] as const

type IdAba = (typeof ABAS)[number]['id']

const VAZIO: Record<IdAba, { titulo: string; texto: string }> = {
  pendentes: { titulo: 'Nenhuma tarefa pendente', texto: 'Tudo em dia. Quando houver uma tarefa nova, ela aparece aqui.' },
  enviadas: { titulo: 'Nenhuma entrega aguardando avaliação', texto: 'As tarefas que você entregar ficam aqui até serem avaliadas.' },
  avaliadas: { titulo: 'Nenhuma entrega avaliada ainda', texto: 'Quando a pessoa docente avaliar uma entrega sua, ela aparece aqui.' },
}

const DA_ABA: Record<IdAba, (s: Situacao) => boolean> = {
  pendentes: (s) => s === 'pendente',
  enviadas: (s) => s === 'enviada' || s === 'atrasada',
  avaliadas: (s) => s === 'avaliada',
}

type Item = { tarefa: MinhaTarefa; situacao: Situacao }

/** Lista de tarefas da aba: pendentes pelo prazo; as demais, da entrega mais recente para a mais antiga. */
function itensDaAba(itens: Item[], aba: IdAba): Item[] {
  const filtrados = itens.filter((i) => DA_ABA[aba](i.situacao))
  if (aba === 'pendentes') return filtrados.sort((a, b) => porPrazo(a.tarefa, b.tarefa))
  const enviada = (i: Item) => i.tarefa.entregas[0]?.enviada_em ?? ''
  return filtrados.sort((a, b) => enviada(b).localeCompare(enviada(a)))
}

/** /tarefas — Pendentes · Enviadas · Avaliadas (SPEC §11). */
export function Tarefas() {
  const { perfil } = useAuth()
  const tarefas = useMinhasTarefas(perfil?.id)

  let conteudo
  if (tarefas.isPending) {
    conteudo = <Carregando texto="Carregando suas tarefas…" />
  } else if (tarefas.isError) {
    conteudo = <ErroComRetry mensagem="Não foi possível carregar suas tarefas." onTentarDeNovo={() => void tarefas.refetch()} />
  } else {
    const itens = tarefas.data.map((tarefa) => ({ tarefa, situacao: situacaoDaEntrega(tarefa.entregas[0], tarefa.prazo) }))
    conteudo = (
      <Abas rotulo="Tarefas por situação" abas={ABAS}>
        {(aba) => {
          const lista = itensDaAba(itens, aba)
          if (lista.length === 0) {
            return (
              <EmptyState titulo={VAZIO[aba].titulo}>
                <p>{VAZIO[aba].texto}</p>
              </EmptyState>
            )
          }
          return (
            <ul className="flex flex-col gap-3">
              {lista.map(({ tarefa, situacao }) => (
                <li key={tarefa.id}>
                  <CartaoTarefa
                    tarefa={tarefa}
                    situacao={situacao}
                    aula={{ titulo: tarefa.aulas.titulo, data: tarefa.aulas.data, disciplina: tarefa.aulas.disciplinas.nome }}
                  />
                </li>
              ))}
            </ul>
          )
        }}
      </Abas>
    )
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Tarefas</h1>
      {conteudo}
    </>
  )
}
