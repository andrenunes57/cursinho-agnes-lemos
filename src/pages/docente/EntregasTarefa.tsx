import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { nomeComPronomes, useAuth } from '../../auth/contexto'
import { AvaliacaoForm, type DadosAvaliacao } from '../../components/AvaliacaoForm'
import { EntregaDetalhe } from '../../components/EntregaDetalhe'
import { classeLink } from '../../components/LinkExterno'
import { TarefaResumo } from '../../components/TarefaResumo'
import { Aviso } from '../../components/ui/Aviso'
import { Button } from '../../components/ui/Button'
import { Carregando } from '../../components/ui/Carregando'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { Etiqueta } from '../../components/ui/Etiqueta'
import { mensagemDeErro } from '../../lib/erros'
import { supabase } from '../../lib/supabase'
import { useResultado, type AoResultado } from '../coordenacao/comum'
import {
  ROTULO_SITUACAO,
  TOM_SITUACAO,
  invalidarTarefas,
  situacaoDaEntrega,
  useEntregasDaTarefa,
  useEstudantesDaTurma,
  useTarefa,
  type Entrega,
  type Situacao,
  type TarefaDetalhe,
} from '../consultasTarefas'

type Linha = { estudanteId: string; nome: string; entrega: Entrega | null; situacao: Situacao }

/** Uma estudante da turma, com a situação e (ao abrir) a entrega e a avaliação. */
function LinhaEstudante({ linha, tarefa, podeAvaliar, avisar }: { linha: Linha; tarefa: TarefaDetalhe; podeAvaliar: boolean; avisar: AoResultado }) {
  const qc = useQueryClient()
  const idPainel = useId()
  const [aberta, setAberta] = useState(false)
  const { entrega, nome, situacao } = linha

  const avaliar = useMutation({
    mutationFn: async (d: DadosAvaliacao) => {
      const { error } = await supabase.rpc('avaliar_entrega', {
        p_entrega_id: (entrega as Entrega).id,
        p_nota: d.nota ?? undefined,
        p_conceito: d.conceito ?? undefined,
        p_devolutiva: d.devolutiva ?? undefined,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await invalidarTarefas(qc)
      avisar({ tipo: 'sucesso', texto: `Avaliação de ${nome} salva.` })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro) }),
  })

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="min-w-0 font-semibold break-words">{nome}</h3>
        <Etiqueta tom={TOM_SITUACAO[situacao]}>{ROTULO_SITUACAO[situacao]}</Etiqueta>
      </div>
      {entrega && (
        <>
          <Button
            variante="secundario"
            className="self-start"
            aria-expanded={aberta}
            aria-controls={idPainel}
            onClick={() => setAberta(!aberta)}
          >
            {/* O texto visível começa o nome acessível (WCAG 2.5.3); o nome da pessoa desambigua a lista. */}
            {aberta ? 'Fechar entrega' : situacao === 'avaliada' || !podeAvaliar ? 'Ver entrega' : 'Abrir e avaliar'}
            <span className="sr-only">: {nome}</span>
          </Button>
          <div id={idPainel} hidden={!aberta} className="flex flex-col gap-4">
            {aberta && (
              <>
                <EntregaDetalhe entrega={entrega} tarefa={tarefa} />
                {podeAvaliar && (
                  <section aria-label={`Avaliar a entrega de ${nome}`} className="flex flex-col gap-2 border-t border-borda pt-4">
                    <h4 className="font-semibold">{entrega.avaliada_em ? 'Reavaliar' : 'Avaliar'}</h4>
                    <AvaliacaoForm
                      key={entrega.avaliada_em ?? 'nova'}
                      tipo={tarefa.tipo_avaliacao}
                      conceitos={tarefa.opcoes_conceito}
                      inicial={entrega}
                      enviando={avaliar.isPending}
                      onEnviar={(d) => avaliar.mutate(d)}
                    />
                  </section>
                )}
              </>
            )}
          </div>
        </>
      )}
    </article>
  )
}

const ORDEM: Situacao[] = ['enviada', 'atrasada', 'avaliada', 'pendente']

/** /docente/tarefas/:id/entregas — estudantes da turma × situação + avaliação (RF-18). */
export function EntregasTarefa() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const tarefa = useTarefa(id)
  const entregas = useEntregasDaTarefa(id)
  const estudantes = useEstudantesDaTurma(tarefa.data?.aulas.turma_id)
  const { resultado, avisar } = useResultado()

  const ehCoordenacao = perfil?.papel === 'coordenacao'
  const aula = tarefa.data?.aulas

  let conteudo
  if (tarefa.isPending || entregas.isPending || (tarefa.data && estudantes.isPending)) {
    conteudo = <Carregando texto="Carregando entregas…" />
  } else if (tarefa.isError || entregas.isError || estudantes.isError) {
    conteudo = (
      <ErroComRetry
        mensagem="Não foi possível carregar as entregas."
        onTentarDeNovo={() => {
          void tarefa.refetch()
          void entregas.refetch()
          void estudantes.refetch()
        }}
      />
    )
  } else if (!tarefa.data || !aula) {
    conteudo = (
      <EmptyState titulo="Tarefa não encontrada">
        <p>
          Ela pode ter sido excluída.{' '}
          <Link to="/docente/aulas" className={classeLink}>
            Voltar para minhas aulas
          </Link>
        </p>
      </EmptyState>
    )
  } else if (aula.professor_id !== perfil?.id && !ehCoordenacao) {
    conteudo = (
      <EmptyState titulo="Esta tarefa é de outra pessoa docente">
        <p>Só quem dá a aula vê e avalia as entregas.</p>
      </EmptyState>
    )
  } else {
    const t = tarefa.data
    const podeAvaliar = aula.professor_id === perfil?.id
    const porEstudante = new Map(entregas.data.map((e) => [e.estudante_id, e]))
    const linhas: Linha[] = (estudantes.data ?? []).map((est) => {
      const entrega = porEstudante.get(est.id) ?? null
      porEstudante.delete(est.id)
      return { estudanteId: est.id, nome: nomeComPronomes(est), entrega, situacao: situacaoDaEntrega(entrega, t.prazo) }
    })
    // Quem entregou e depois saiu da turma continua com a entrega visível (decisão da F5, §19).
    for (const entrega of porEstudante.values()) {
      linhas.push({ estudanteId: entrega.estudante_id, nome: 'Estudante fora da turma', entrega, situacao: situacaoDaEntrega(entrega, t.prazo) })
    }
    linhas.sort((a, b) => ORDEM.indexOf(a.situacao) - ORDEM.indexOf(b.situacao) || a.nome.localeCompare(b.nome, 'pt-BR'))

    const conta = (s: Situacao) => linhas.filter((l) => l.situacao === s).length
    conteudo = (
      <>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="font-semibold">Aula</dt>
          <dd className="min-w-0 break-words">
            <Link to={`/docente/aulas/${aula.id}?aba=tarefas`} className={classeLink}>
              {aula.disciplinas.nome} · {aula.titulo}
            </Link>
          </dd>
          <dt className="font-semibold">Turma</dt>
          <dd>{aula.turmas.nome}</dd>
        </dl>
        <TarefaResumo tarefa={t} mostrarInstrucoes={false} />
        {!t.publicada && (
          <p className="rounded-lg border-l-4 border-marca bg-marca-clara px-4 py-3">
            Esta tarefa ainda é rascunho: a turma não a vê e ninguém consegue entregar.
          </p>
        )}
        {!podeAvaliar && (
          <p className="rounded-lg border-l-4 border-marca bg-marca-clara px-4 py-3">
            Você está vendo como coordenação: só leitura. Quem avalia é a pessoa docente da aula.
          </p>
        )}

        <section aria-labelledby="titulo-resumo" className="flex flex-col gap-2">
          <h2 id="titulo-resumo" className="text-xl font-semibold">
            Resumo
          </h2>
          <ul className="flex flex-wrap gap-2" aria-label="Quantidade por situação">
            {(['pendente', 'enviada', 'atrasada', 'avaliada'] as const).map((s) => (
              <li key={s}>
                <Etiqueta tom={TOM_SITUACAO[s]}>
                  {ROTULO_SITUACAO[s]}: {conta(s)}
                </Etiqueta>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="titulo-estudantes" className="flex flex-col gap-3">
          <h2 id="titulo-estudantes" className="text-xl font-semibold">
            Estudantes
          </h2>
          {linhas.length === 0 ? (
            <EmptyState titulo="Nenhuma pessoa estudante matriculada nesta turma">
              <p>Quando a coordenação fizer as matrículas, a turma aparece aqui.</p>
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {linhas.map((linha) => (
                <li key={linha.estudanteId}>
                  <LinhaEstudante linha={linha} tarefa={t} podeAvaliar={podeAvaliar} avisar={avisar} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </>
    )
  }

  return (
    <>
      {aula && (
        <p>
          <Link to={`/docente/aulas/${aula.id}?aba=tarefas`} className={classeLink}>
            <span aria-hidden="true">← </span>
            {aula.titulo}
          </Link>
        </p>
      )}
      <h1 className="text-3xl font-bold break-words text-marca">
        {tarefa.data ? `Entregas: ${tarefa.data.titulo}` : 'Entregas'}
      </h1>
      <Aviso tipo={resultado?.tipo}>{resultado?.texto}</Aviso>
      {conteudo}
    </>
  )
}
