import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState, type FormEvent } from 'react'
import { nomeComPronomes } from '../../auth/contexto'
import { Aviso } from '../../components/ui/Aviso'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Carregando } from '../../components/ui/Carregando'
import { Checkbox } from '../../components/ui/Checkbox'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { Etiqueta } from '../../components/ui/Etiqueta'
import { Field } from '../../components/ui/Field'
import { Select } from '../../components/ui/Select'
import { anoSP } from '../../lib/datas'
import { mensagemDeErro } from '../../lib/erros'
import { supabase } from '../../lib/supabase'
import { validarAno, validarNomeTurma } from '../../lib/validacoes'
import { plural, useResultado, type AoResultado } from './comum'
import { chaves, invalidarPessoas, usePessoas, useTurmas, type Turma } from './consultas'

type DadosTurma = { nome: string; ano: number; ativa: boolean }

function FormTurma({
  inicial,
  textoBotao,
  enviando,
  onEnviar,
  onCancelar,
}: {
  inicial?: Turma
  textoBotao: string
  enviando: boolean
  onEnviar: (d: DadosTurma) => void
  onCancelar: () => void
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [ano, setAno] = useState(String(inicial?.ano ?? anoSP()))
  const [ativa, setAtiva] = useState(inicial?.ativa ?? true)
  const [tentou, setTentou] = useState(false)
  const refNome = useRef<HTMLInputElement>(null)
  const refAno = useRef<HTMLInputElement>(null)

  const erroNome = validarNomeTurma(nome)
  const erroAno = validarAno(ano)

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTentou(true)
    if (erroNome) return refNome.current?.focus()
    if (erroAno) return refAno.current?.focus()
    onEnviar({ nome: nome.trim(), ano: Number(ano), ativa })
  }

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      <Field
        ref={refNome}
        rotulo="Nome da turma"
        dica="Ex.: Turma 2027"
        obrigatorio
        autoComplete="off"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        erro={tentou ? erroNome : null}
      />
      <Field
        ref={refAno}
        rotulo="Ano"
        obrigatorio
        inputMode="numeric"
        autoComplete="off"
        className="max-w-32"
        value={ano}
        onChange={(e) => setAno(e.target.value)}
        erro={tentou ? erroAno : null}
      />
      {inicial && (
        <Checkbox checked={ativa} onChange={(e) => setAtiva(e.target.checked)}>
          Turma ativa (aceita novas aulas)
        </Checkbox>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" carregando={enviando} textoCarregando="Salvando…">
          {textoBotao}
        </Button>
        <Button variante="discreto" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

/** Mutação que salva, avisa e atualiza as listas. */
function useSalvar<T>(fn: (v: T) => Promise<string>, avisar: AoResultado, aoConcluir?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async (texto) => {
      await invalidarPessoas(qc)
      aoConcluir?.()
      avisar({ tipo: 'sucesso', texto })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro, 'Já existe uma turma com esses dados.') }),
  })
}

// ---------------------------------------------------------------------------
// Estudantes matriculados na turma (RF-07)
// ---------------------------------------------------------------------------
function EstudantesDaTurma({ turma, avisar }: { turma: Turma; avisar: AoResultado }) {
  const pessoas = usePessoas()
  const [escolhida, setEscolhida] = useState('')
  const [erroEscolha, setErroEscolha] = useState<string | null>(null)

  const matriculas = useQuery({
    queryKey: chaves.matriculasDaTurma(turma.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matriculas')
        .select('estudante_id, perfis(nome_social, pronomes, email)')
        .eq('turma_id', turma.id)
      if (error) throw error
      return data
        .map((m) => ({ id: m.estudante_id, ...m.perfis }))
        .sort((a, b) => (a.nome_social ?? a.email).localeCompare(b.nome_social ?? b.email, 'pt-BR'))
    },
  })

  const matricular = useSalvar(
    async (id: string) => {
      const { error } = await supabase.from('matriculas').insert({ estudante_id: id, turma_id: turma.id })
      if (error) throw error
      return `Matrícula registrada em ${turma.nome}.`
    },
    avisar,
    () => setEscolhida(''),
  )

  const desmatricular = useSalvar(async (id: string) => {
    const { error } = await supabase.from('matriculas').delete().eq('estudante_id', id).eq('turma_id', turma.id)
    if (error) throw error
    return `Matrícula removida de ${turma.nome}.`
  }, avisar)

  if (matriculas.isPending || pessoas.isPending) return <Carregando texto="Carregando estudantes…" />
  if (matriculas.isError || pessoas.isError) {
    return (
      <ErroComRetry
        mensagem="Não foi possível carregar a lista de estudantes da turma."
        onTentarDeNovo={() => {
          void matriculas.refetch()
          void pessoas.refetch()
        }}
      />
    )
  }

  const jaMatriculadas = new Set(matriculas.data.map((m) => m.id))
  const disponiveis = pessoas.data
    .filter((p) => p.papel === 'estudante' && p.status === 'ativo' && !jaMatriculadas.has(p.id))
    .map((p) => ({ valor: p.id, rotulo: nomeComPronomes(p) }))

  return (
    <div className="flex flex-col gap-4 border-t border-borda pt-4">
      {matriculas.data.length === 0 ? (
        <p className="text-texto-suave">Nenhuma pessoa estudante matriculada nesta turma.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-borda" aria-label={`Estudantes de ${turma.nome}`}>
          {matriculas.data.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="block font-medium">{m.nome_social ? nomeComPronomes(m) : m.email}</span>
                <span className="block text-sm break-all text-texto-suave">{m.email}</span>
              </span>
              <Button
                variante="secundario"
                aria-label={`Desmatricular ${m.nome_social ?? m.email}`}
                carregando={desmatricular.isPending && desmatricular.variables === m.id}
                onClick={() => desmatricular.mutate(m.id)}
              >
                Desmatricular
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        noValidate
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!escolhida) return setErroEscolha('Escolha uma pessoa estudante.')
          matricular.mutate(escolhida)
        }}
      >
        <div className="min-w-0 flex-1 basis-56">
          <Select
            rotulo="Matricular estudante"
            vazio={disponiveis.length ? 'Escolha uma pessoa' : 'Todas as pessoas estudantes ativas já têm matrícula'}
            opcoes={disponiveis}
            value={escolhida}
            erro={erroEscolha}
            onChange={(e) => {
              setErroEscolha(null)
              setEscolhida(e.target.value)
            }}
          />
        </div>
        <Button type="submit" variante="secundario" carregando={matricular.isPending} textoCarregando="Salvando…">
          Matricular
        </Button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
function CartaoTurma({ turma, avisar }: { turma: Turma; avisar: AoResultado }) {
  const [editando, setEditando] = useState(false)
  const [verEstudantes, setVerEstudantes] = useState(false)
  const idEstudantes = useId()

  const salvar = useSalvar(
    async (d: DadosTurma) => {
      const { error } = await supabase.from('turmas').update(d).eq('id', turma.id)
      if (error) throw error
      return `Turma atualizada: ${d.nome}.`
    },
    avisar,
    () => setEditando(false),
  )

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold">{turma.nome}</h2>
        <Etiqueta tom={turma.ativa ? 'sucesso' : 'neutro'}>{turma.ativa ? 'Ativa' : 'Inativa'}</Etiqueta>
      </div>
      <p className="text-sm text-texto-suave">
        Ano {turma.ano} · {plural(turma.estudantes, 'matrícula', 'matrículas')}
      </p>

      {editando ? (
        <FormTurma
          inicial={turma}
          textoBotao="Salvar turma"
          enviando={salvar.isPending}
          onEnviar={(d) => salvar.mutate(d)}
          onCancelar={() => setEditando(false)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variante="secundario" aria-label={`Editar ${turma.nome}`} onClick={() => setEditando(true)}>
            Editar
          </Button>
          <Button
            variante="secundario"
            aria-expanded={verEstudantes}
            aria-controls={idEstudantes}
            aria-label={`Estudantes de ${turma.nome}`}
            onClick={() => setVerEstudantes((v) => !v)}
          >
            Estudantes
          </Button>
        </div>
      )}
      <div id={idEstudantes} hidden={!verEstudantes}>
        {verEstudantes && <EstudantesDaTurma turma={turma} avisar={avisar} />}
      </div>
    </Card>
  )
}

/** /coordenacao/turmas — criar e editar turmas; matricular e desmatricular (RF-07). */
export function Turmas() {
  const turmas = useTurmas()
  const { resultado, avisar } = useResultado()
  const [criando, setCriando] = useState(false)

  const criar = useSalvar(
    async (d: DadosTurma) => {
      const { error } = await supabase.from('turmas').insert({ nome: d.nome, ano: d.ano })
      if (error) throw error
      return `Turma criada: ${d.nome}.`
    },
    avisar,
    () => setCriando(false),
  )

  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Turmas</h1>
      <Aviso tipo={resultado?.tipo}>{resultado?.texto}</Aviso>

      {criando ? (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nova turma</h2>
          <FormTurma
            textoBotao="Criar turma"
            enviando={criar.isPending}
            onEnviar={(d) => criar.mutate(d)}
            onCancelar={() => setCriando(false)}
          />
        </Card>
      ) : (
        <Button className="self-start" onClick={() => setCriando(true)}>
          Nova turma
        </Button>
      )}

      {turmas.isPending ? (
        <Carregando texto="Carregando turmas…" />
      ) : turmas.isError ? (
        <ErroComRetry mensagem="Não foi possível carregar as turmas." onTentarDeNovo={() => void turmas.refetch()} />
      ) : turmas.data.length === 0 ? (
        <EmptyState titulo="Nenhuma turma cadastrada">
          <p>Use “Nova turma” para criar a primeira (ex.: Turma 2027).</p>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {turmas.data.map((t) => (
            <li key={t.id}>
              <CartaoTurma turma={t} avisar={avisar} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
