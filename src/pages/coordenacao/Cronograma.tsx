import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { nomeComPronomes } from '../../auth/contexto'
import { AulaForm, type DadosAula } from '../../components/AulaForm'
import { Aviso } from '../../components/ui/Aviso'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Carregando } from '../../components/ui/Carregando'
import { Confirmacao } from '../../components/ui/Confirmacao'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { Etiqueta } from '../../components/ui/Etiqueta'
import { Select, type OpcaoSelect } from '../../components/ui/Select'
import {
  ehDataISO,
  formatarDataLonga,
  formatarDiaMes,
  formatarHora,
  hojeSP,
  inicioDaSemana,
  intervaloDaSemana,
  primeiraMaiuscula,
  somarDias,
} from '../../lib/datas'
import { mensagemDeErro } from '../../lib/erros'
import { supabase } from '../../lib/supabase'
import { useResultado, type AoResultado } from './comum'
import {
  aulasComChamada,
  chaves,
  invalidarAulas,
  useDisciplinas,
  useEquipe,
  useTurmas,
  type Disciplina,
  type MembroEquipe,
  type Turma,
} from './consultas'

type AulaDaSemana = DadosAula & {
  id: string
  disciplina: string
  docente: { nome_social: string | null; pronomes: string | null }
  temChamada: boolean
}

function useAulasDaSemana(turmaId: string | undefined, de: string, ate: string) {
  return useQuery({
    queryKey: chaves.aulasDaSemana(turmaId ?? '', de),
    enabled: Boolean(turmaId),
    queryFn: async (): Promise<AulaDaSemana[]> => {
      const { data, error } = await supabase
        .from('aulas')
        .select(
          'id, data, inicio, titulo, turma_id, disciplina_id, professor_id, disciplinas(nome), perfis!professor_id(nome_social, pronomes)',
        )
        .eq('turma_id', turmaId as string)
        .gte('data', de)
        .lte('data', ate)
        .order('data')
        .order('inicio', { nullsFirst: true })
      if (error) throw error
      const comChamada = await aulasComChamada(data.map((a) => a.id))
      return data.map(({ disciplinas, perfis, ...aula }) => ({
        ...aula,
        disciplina: disciplinas.nome,
        docente: perfis,
        temChamada: comChamada.has(aula.id),
      }))
    },
  })
}

/** Opções ativas + a atual (uma aula antiga pode apontar para algo desativado depois). */
function opcoesTurma(turmas: Turma[], atual?: string): OpcaoSelect[] {
  return turmas.filter((t) => t.ativa || t.id === atual).map((t) => ({ valor: t.id, rotulo: `${t.nome} (${t.ano})` }))
}
function opcoesDisciplina(disciplinas: Disciplina[], atual?: string): OpcaoSelect[] {
  return disciplinas.filter((d) => d.ativa || d.id === atual).map((d) => ({ valor: d.id, rotulo: d.nome }))
}
function opcoesDocente(equipe: MembroEquipe[], atual?: { id: string; nome: string }): OpcaoSelect[] {
  const opcoes = equipe.map((m) => ({
    valor: m.id,
    rotulo: `${nomeComPronomes(m)}${m.papel === 'coordenacao' ? ' — Coordenação' : ''}`,
  }))
  if (atual && !opcoes.some((o) => o.valor === atual.id)) {
    opcoes.push({ valor: atual.id, rotulo: `${atual.nome} — cadastro inativo` })
  }
  return opcoes
}

type Listas = { turmas: Turma[]; disciplinas: Disciplina[]; equipe: MembroEquipe[] }

function CartaoAula({ aula, listas, hoje, avisar }: { aula: AulaDaSemana; listas: Listas; hoje: string; avisar: AoResultado }) {
  const qc = useQueryClient()
  const [editando, setEditando] = useState(false)
  const nomeDocente = nomeComPronomes(aula.docente)

  const salvar = useMutation({
    mutationFn: async (d: DadosAula) => {
      const { error } = await supabase.from('aulas').update(d).eq('id', aula.id)
      if (error) throw error
    },
    onSuccess: async (_, d) => {
      await invalidarAulas(qc)
      setEditando(false)
      avisar({ tipo: 'sucesso', texto: `Aula ${d.titulo} atualizada.` })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro) }),
  })

  const excluir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('aulas').delete().eq('id', aula.id)
      if (error) throw error
    },
    onSuccess: async () => {
      await invalidarAulas(qc)
      avisar({ tipo: 'sucesso', texto: `Aula ${aula.titulo} excluída.` })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro) }),
  })

  const hora = formatarHora(aula.inicio)

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="min-w-0 text-lg font-semibold">{aula.titulo}</h4>
        {aula.data <= hoje && (
          <Etiqueta tom={aula.temChamada ? 'sucesso' : 'alerta'}>{aula.temChamada ? 'Chamada feita' : 'Sem chamada'}</Etiqueta>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="font-semibold">Disciplina</dt>
        <dd>{aula.disciplina}</dd>
        <dt className="font-semibold">Docente</dt>
        <dd>{nomeDocente}</dd>
        {hora && (
          <>
            <dt className="font-semibold">Início</dt>
            <dd>{hora}</dd>
          </>
        )}
      </dl>

      {editando ? (
        <AulaForm
          inicial={aula}
          turmas={opcoesTurma(listas.turmas, aula.turma_id)}
          disciplinas={opcoesDisciplina(listas.disciplinas, aula.disciplina_id)}
          docentes={opcoesDocente(listas.equipe, { id: aula.professor_id, nome: nomeDocente })}
          enviando={salvar.isPending}
          textoBotao="Salvar aula"
          onEnviar={(d) => salvar.mutate(d)}
          onCancelar={() => setEditando(false)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/docente/aulas/${aula.id}`}
            aria-label={`Ver materiais de ${aula.titulo}`}
            className="inline-flex min-h-11 items-center px-2 font-semibold text-marca underline underline-offset-4"
          >
            Ver materiais
          </Link>
          <Button variante="secundario" aria-label={`Editar ${aula.titulo}`} onClick={() => setEditando(true)}>
            Editar
          </Button>
          <Confirmacao
            rotulo="Excluir"
            rotuloAcessivel={`Excluir ${aula.titulo}`}
            rotuloConfirmar="Confirmar exclusão"
            aviso="Excluir a aula apaga também os materiais, as tarefas, as entregas e a chamada dela. Não dá para desfazer."
            carregando={excluir.isPending}
            onConfirmar={() => excluir.mutate()}
          />
        </div>
      )}
    </Card>
  )
}

/** /coordenacao/aulas — cronograma por turma e semana; criar, editar, excluir e reatribuir (RF-09). */
export function Cronograma() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const { resultado, avisar } = useResultado()
  const [criando, setCriando] = useState(false)

  const turmas = useTurmas()
  const disciplinas = useDisciplinas()
  const equipe = useEquipe()

  const hoje = hojeSP()
  const paramSemana = params.get('semana')
  const { de, ate } = intervaloDaSemana(ehDataISO(paramSemana) ? paramSemana : hoje)

  const lista = turmas.data ?? []
  const turmaId = lista.find((t) => t.id === params.get('turma'))?.id ?? (lista.find((t) => t.ativa) ?? lista[0])?.id

  const aulas = useAulasDaSemana(turmaId, de, ate)

  function mudar(chave: 'turma' | 'semana', valor: string) {
    setParams(
      (atual) => {
        atual.set(chave, valor)
        return atual
      },
      { replace: true },
    )
  }

  const criar = useMutation({
    mutationFn: async (d: DadosAula) => {
      const { error } = await supabase.from('aulas').insert(d)
      if (error) throw error
    },
    onSuccess: async (_, d) => {
      await invalidarAulas(qc)
      setCriando(false)
      // Mostra a semana e a turma da aula criada.
      setParams({ turma: d.turma_id, semana: inicioDaSemana(d.data) }, { replace: true })
      avisar({ tipo: 'sucesso', texto: `Aula ${d.titulo} criada.` })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro) }),
  })

  const carregando = turmas.isPending || disciplinas.isPending || equipe.isPending
  const erro = turmas.isError || disciplinas.isError || equipe.isError

  let conteudo
  if (carregando) {
    conteudo = <Carregando texto="Carregando cronograma…" />
  } else if (erro) {
    conteudo = (
      <ErroComRetry
        mensagem="Não foi possível carregar o cronograma."
        onTentarDeNovo={() => {
          void turmas.refetch()
          void disciplinas.refetch()
          void equipe.refetch()
        }}
      />
    )
  } else if (!turmaId) {
    conteudo = (
      <EmptyState titulo="Nenhuma turma cadastrada">
        <p>
          Para montar o cronograma, primeiro{' '}
          <Link to="/coordenacao/turmas" className="font-semibold text-marca underline underline-offset-4">
            cadastre uma turma
          </Link>
          .
        </p>
      </EmptyState>
    )
  } else {
    const listas: Listas = { turmas: lista, disciplinas: disciplinas.data, equipe: equipe.data }
    const dataPadrao = hoje >= de && hoje <= ate ? hoje : de

    conteudo = (
      <>
        <div className="flex flex-col gap-4 largo:flex-row largo:items-end">
          <div className="largo:w-72">
            <Select
              rotulo="Turma"
              opcoes={lista.map((t) => ({ valor: t.id, rotulo: `${t.nome} (${t.ano})${t.ativa ? '' : ' — inativa'}` }))}
              value={turmaId}
              onChange={(e) => mudar('turma', e.target.value)}
            />
          </div>
          <nav aria-label="Semanas" className="flex flex-wrap gap-2">
            <Button variante="secundario" onClick={() => mudar('semana', somarDias(de, -7))}>
              Semana anterior
            </Button>
            <Button variante="secundario" onClick={() => mudar('semana', inicioDaSemana(hoje))}>
              Esta semana
            </Button>
            <Button variante="secundario" onClick={() => mudar('semana', somarDias(de, 7))}>
              Próxima semana
            </Button>
          </nav>
        </div>

        {criando ? (
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Nova aula</h2>
            <AulaForm
              inicial={{ turma_id: turmaId, data: dataPadrao }}
              turmas={opcoesTurma(lista)}
              disciplinas={opcoesDisciplina(disciplinas.data)}
              docentes={opcoesDocente(equipe.data)}
              enviando={criar.isPending}
              textoBotao="Criar aula"
              onEnviar={(d) => criar.mutate(d)}
              onCancelar={() => setCriando(false)}
            />
          </Card>
        ) : (
          <Button className="self-start" onClick={() => setCriando(true)}>
            Nova aula
          </Button>
        )}

        <section aria-labelledby="titulo-semana" className="flex flex-col gap-4">
          <h2 id="titulo-semana" className="text-xl font-semibold" aria-live="polite">
            Semana de {formatarDiaMes(de)} a {formatarDiaMes(ate)}
          </h2>
          <ListaDaSemana aulas={aulas} listas={listas} hoje={hoje} avisar={avisar} />
        </section>
      </>
    )
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Cronograma de aulas</h1>
      <Aviso tipo={resultado?.tipo}>{resultado?.texto}</Aviso>
      {conteudo}
    </>
  )
}

function ListaDaSemana({
  aulas,
  listas,
  hoje,
  avisar,
}: {
  aulas: ReturnType<typeof useAulasDaSemana>
  listas: Listas
  hoje: string
  avisar: AoResultado
}) {
  if (aulas.isPending) return <Carregando texto="Carregando aulas…" />
  if (aulas.isError) {
    return <ErroComRetry mensagem="Não foi possível carregar as aulas." onTentarDeNovo={() => void aulas.refetch()} />
  }
  if (aulas.data.length === 0) {
    return (
      <EmptyState titulo="Nenhuma aula nesta semana">
        <p>Use “Nova aula” para cadastrar, ou navegue para outra semana.</p>
      </EmptyState>
    )
  }

  const dias = [...new Set(aulas.data.map((a) => a.data))]
  return (
    <>
      {dias.map((dia) => (
        <section key={dia} aria-labelledby={`dia-${dia}`} className="flex flex-col gap-3">
          <h3 id={`dia-${dia}`} className="font-semibold">
            {primeiraMaiuscula(formatarDataLonga(dia))}
            {dia === hoje && ' (hoje)'}
          </h3>
          <ul className="flex flex-col gap-3">
            {aulas.data
              .filter((a) => a.data === dia)
              .map((a) => (
                <li key={a.id}>
                  <CartaoAula aula={a} listas={listas} hoje={hoje} avisar={avisar} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  )
}
