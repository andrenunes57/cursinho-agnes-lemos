import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/contexto'
import { AulaForm, type DadosAula } from '../../components/AulaForm'
import { MateriaisDocente } from '../../components/MateriaisDocente'
import { Abas } from '../../components/ui/Abas'
import { Aviso } from '../../components/ui/Aviso'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Carregando } from '../../components/ui/Carregando'
import { Confirmacao } from '../../components/ui/Confirmacao'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { formatarQuando } from '../../lib/datas'
import { mensagemDeErro } from '../../lib/erros'
import { supabase } from '../../lib/supabase'
import { useResultadoComAvisoDaNavegacao, type AoResultado } from '../coordenacao/comum'
import { invalidarAulas, useDisciplinas, useTurmas } from '../coordenacao/consultas'
import { useAula, useNomeDocente, type Aula } from '../consultasAulas'

const classeLink = 'font-semibold text-marca underline underline-offset-4'

const ABAS = [
  { id: 'materiais', rotulo: 'Materiais' },
  { id: 'tarefas', rotulo: 'Tarefas' },
  { id: 'chamada', rotulo: 'Chamada' },
] as const

/** Editar e excluir a própria aula (RF-10). Sem reatribuir docente: isso é da coordenação. */
function EdicaoDaAula({ aula, voltarPara, avisar }: { aula: Aula; voltarPara: string; avisar: AoResultado }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [editando, setEditando] = useState(false)
  const turmas = useTurmas()
  const disciplinas = useDisciplinas()

  const salvar = useMutation({
    mutationFn: async ({ turma_id, disciplina_id, data, inicio, titulo }: DadosAula) => {
      const { error } = await supabase.from('aulas').update({ turma_id, disciplina_id, data, inicio, titulo }).eq('id', aula.id)
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
      void navigate(voltarPara, { state: { aviso: `Aula ${aula.titulo} excluída.` } })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro) }),
  })

  if (editando) {
    if (turmas.isPending || disciplinas.isPending) return <Carregando texto="Carregando turmas e disciplinas…" />
    if (turmas.isError || disciplinas.isError) {
      return (
        <ErroComRetry
          mensagem="Não foi possível carregar turmas e disciplinas."
          onTentarDeNovo={() => {
            void turmas.refetch()
            void disciplinas.refetch()
          }}
        />
      )
    }
    // Opções ativas + a atual (pode ter sido desativada depois).
    const opcoesTurma = turmas.data
      .filter((t) => t.ativa || t.id === aula.turma_id)
      .map((t) => ({ valor: t.id, rotulo: `${t.nome} (${t.ano})` }))
    const opcoesDisciplina = disciplinas.data
      .filter((d) => d.ativa || d.id === aula.disciplina_id)
      .map((d) => ({ valor: d.id, rotulo: d.nome }))
    return (
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Editar aula</h2>
        <AulaForm
          inicial={aula}
          turmas={opcoesTurma}
          disciplinas={opcoesDisciplina}
          enviando={salvar.isPending}
          textoBotao="Salvar aula"
          onEnviar={(d) => salvar.mutate(d)}
          onCancelar={() => setEditando(false)}
        />
      </Card>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variante="secundario" onClick={() => setEditando(true)}>
        Editar aula
      </Button>
      <Confirmacao
        rotulo="Excluir aula"
        rotuloConfirmar="Confirmar exclusão"
        aviso="Excluir a aula apaga também os materiais, as tarefas, as entregas e a chamada dela. Não dá para desfazer."
        carregando={excluir.isPending}
        onConfirmar={() => excluir.mutate()}
      />
    </div>
  )
}

/** /docente/aulas/:id — aula com as abas Materiais · Tarefas · Chamada (SPEC §11). */
export function AulaDocente() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const aula = useAula(id)
  const nomeDocente = useNomeDocente()
  const { resultado, avisar } = useResultadoComAvisoDaNavegacao()

  const ehCoordenacao = perfil?.papel === 'coordenacao'
  const voltarPara = '/docente/aulas'
  const voltarCoordenacao = ehCoordenacao && aula.data?.professor_id !== perfil?.id

  let conteudo
  if (aula.isPending) {
    conteudo = <Carregando texto="Carregando aula…" />
  } else if (aula.isError) {
    conteudo = <ErroComRetry mensagem="Não foi possível carregar a aula." onTentarDeNovo={() => void aula.refetch()} />
  } else if (!aula.data) {
    conteudo = (
      <EmptyState titulo="Aula não encontrada">
        <p>
          Ela pode ter sido excluída.{' '}
          <Link to={ehCoordenacao ? '/coordenacao/aulas' : voltarPara} className={classeLink}>
            {ehCoordenacao ? 'Voltar para o cronograma' : 'Voltar para minhas aulas'}
          </Link>
        </p>
      </EmptyState>
    )
  } else {
    const a = aula.data
    const ehDocenteDaAula = a.professor_id === perfil?.id
    conteudo = (
      <>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="font-semibold">Quando</dt>
          <dd>{formatarQuando(a.data, a.inicio)}</dd>
          <dt className="font-semibold">Turma</dt>
          <dd>{a.turma}</dd>
          <dt className="font-semibold">Disciplina</dt>
          <dd>{a.disciplina}</dd>
          <dt className="font-semibold">Docente</dt>
          <dd>{ehDocenteDaAula ? 'Você' : nomeDocente(a.professor_id)}</dd>
        </dl>

        {ehDocenteDaAula && <EdicaoDaAula aula={a} voltarPara={voltarPara} avisar={avisar} />}

        {!ehDocenteDaAula && !ehCoordenacao ? (
          <EmptyState titulo="Esta aula é de outra pessoa docente">
            <p>Só quem dá a aula gerencia os materiais, as tarefas e a chamada.</p>
          </EmptyState>
        ) : (
          <>
            {!ehDocenteDaAula && (
              <p className="rounded-lg border-l-4 border-marca bg-marca-clara px-4 py-3">
                Você está vendo como coordenação: só leitura. Dá para excluir materiais, para moderação.
              </p>
            )}
            <Abas rotulo="Seções da aula" abas={ABAS}>
              {(aba) =>
                aba === 'materiais' ? (
                  <MateriaisDocente aula={a} podeEditar={ehDocenteDaAula} podeExcluir={ehCoordenacao} avisar={avisar} />
                ) : (
                  <EmptyState titulo={aba === 'tarefas' ? 'Tarefas chegam em breve' : 'Chamada chega em breve'}>
                    <p>Esta seção entra numa próxima versão do sistema.</p>
                  </EmptyState>
                )
              }
            </Abas>
          </>
        )}
      </>
    )
  }

  return (
    <>
      <p>
        <Link to={voltarCoordenacao ? '/coordenacao/aulas' : voltarPara} className={classeLink}>
          <span aria-hidden="true">← </span>
          {voltarCoordenacao ? 'Cronograma' : 'Minhas aulas'}
        </Link>
      </p>
      <h1 className="text-3xl font-bold break-words text-marca">{aula.data?.titulo ?? 'Aula'}</h1>
      <Aviso tipo={resultado?.tipo}>{resultado?.texto}</Aviso>
      {conteudo}
    </>
  )
}
