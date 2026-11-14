import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import { nomeComPronomes, useAuth } from '../../auth/contexto'
import { Abas } from '../../components/ui/Abas'
import { Aviso } from '../../components/ui/Aviso'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Carregando } from '../../components/ui/Carregando'
import { Checkbox } from '../../components/ui/Checkbox'
import { Confirmacao } from '../../components/ui/Confirmacao'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { Etiqueta } from '../../components/ui/Etiqueta'
import { MensagemErro } from '../../components/ui/MensagemErro'
import { RadioGroup } from '../../components/ui/RadioGroup'
import { Select } from '../../components/ui/Select'
import { mensagemDeErro } from '../../lib/erros'
import { OPCOES_PAPEL, ROTULO_PAPEL, type Papel } from '../../lib/papeis'
import { supabase } from '../../lib/supabase'
import { plural, useResultado, type AoResultado } from './comum'
import { invalidarPessoas, usePessoas, useTurmas, type Pessoa, type Turma } from './consultas'

const ABAS = [
  { id: 'pendentes', rotulo: 'Pendentes' },
  { id: 'ativas', rotulo: 'Ativas' },
  { id: 'inativas', rotulo: 'Inativas' },
] as const

/** Nome social (pronomes); quem não concluiu o onboarding ainda não tem nome. */
function nomeDaPessoa(p: Pessoa): string {
  return p.nome_social ? nomeComPronomes(p) : 'Primeiro acesso não concluído'
}

function Identificacao({ pessoa }: { pessoa: Pessoa }) {
  return (
    <>
      <span className={`block font-semibold ${pessoa.nome_social ? '' : 'italic'}`}>{nomeDaPessoa(pessoa)}</span>
      <span className="block text-sm break-all text-texto-suave">{pessoa.email}</span>
    </>
  )
}

/** Mutação de RPC que avisa o resultado na página e atualiza as listas. */
function useAcao<T>(fn: (v: T) => Promise<string>, avisar: AoResultado) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async (texto) => {
      await invalidarPessoas(qc)
      avisar({ tipo: 'sucesso', texto })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro) }),
  })
}

async function definirStatus(id: string, status: 'ativo' | 'inativo') {
  const { error } = await supabase.rpc('definir_status', { p_id: id, p_status: status })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Pendentes: seleção múltipla → papel + turma → Aprovar (RF-05)
// ---------------------------------------------------------------------------
function Pendentes({ pessoas, turmas, avisar }: { pessoas: Pessoa[]; turmas: Turma[]; avisar: AoResultado }) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [papel, setPapel] = useState<Papel>('estudante')
  const [turmaId, setTurmaId] = useState('')
  const [erroSelecao, setErroSelecao] = useState<string | null>(null)
  const idErro = useId()

  const aprovar = useAcao(async () => {
    const { data, error } = await supabase.rpc('aprovar_cadastros', {
      p_ids: [...selecionadas],
      p_papel: papel,
      p_turma_id: papel === 'estudante' && turmaId ? turmaId : undefined,
    })
    if (error) throw error
    setSelecionadas(new Set())
    return `${plural(data, 'cadastro aprovado', 'cadastros aprovados')}.`
  }, avisar)

  const recusar = useAcao(async (id: string) => {
    await definirStatus(id, 'inativo')
    return 'Cadastro recusado. A pessoa está na aba Inativas.'
  }, avisar)

  if (pessoas.length === 0) {
    return (
      <EmptyState titulo="Nenhum cadastro aguardando aprovação">
        <p>Quando alguém entrar pela primeira vez no sistema, o cadastro aparece aqui.</p>
      </EmptyState>
    )
  }

  const todas = selecionadas.size === pessoas.length
  const alternar = (id: string, marcar: boolean) => {
    setErroSelecao(null)
    setSelecionadas((atual) => {
      const nova = new Set(atual)
      if (marcar) nova.add(id)
      else nova.delete(id)
      return nova
    })
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (selecionadas.size === 0) {
      setErroSelecao('Selecione pelo menos uma pessoa.')
      return
    }
    aprovar.mutate(undefined)
  }

  const turmasAtivas = turmas.filter((t) => t.ativa).map((t) => ({ valor: t.id, rotulo: `${t.nome} (${t.ano})` }))

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      <Checkbox
        checked={todas}
        onChange={(e) => {
          setErroSelecao(null)
          setSelecionadas(e.target.checked ? new Set(pessoas.map((p) => p.id)) : new Set())
        }}
      >
        Selecionar todas ({pessoas.length})
      </Checkbox>

      <ul className="flex flex-col gap-3" aria-describedby={erroSelecao ? idErro : undefined}>
        {pessoas.map((p) => (
          <li key={p.id}>
            <Card className="flex flex-col gap-2">
              <Checkbox checked={selecionadas.has(p.id)} onChange={(e) => alternar(p.id, e.target.checked)}>
                <Identificacao pessoa={p} />
              </Checkbox>
              <div>
                <Confirmacao
                  rotulo="Recusar"
                  rotuloAcessivel={`Recusar ${p.nome_social ?? p.email}`}
                  rotuloConfirmar="Confirmar recusa"
                  aviso="A pessoa vai para a aba Inativas e continua sem acesso. Dá para reativar depois."
                  carregando={recusar.isPending && recusar.variables === p.id}
                  onConfirmar={() => recusar.mutate(p.id)}
                />
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <fieldset className="flex flex-col gap-4 rounded-xl border-2 border-marca bg-marca-clara p-4">
        <legend className="px-1 text-lg font-semibold">Aprovar as pessoas selecionadas</legend>
        <RadioGroup legenda="Papel" nome="papel-aprovacao" opcoes={OPCOES_PAPEL} valor={papel} onChange={setPapel} />
        {papel === 'estudante' && (
          <Select
            rotulo="Turma"
            dica="Ao aprovar como estudante, a pessoa já recebe matrícula nesta turma."
            vazio="Sem turma por enquanto"
            opcoes={turmasAtivas}
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
          />
        )}
        {erroSelecao && <MensagemErro id={idErro}>{erroSelecao}</MensagemErro>}
        <Button type="submit" carregando={aprovar.isPending} textoCarregando="Aprovando…" className="self-start">
          Aprovar ({selecionadas.size})
        </Button>
      </fieldset>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Ativas: papel, status e matrículas (RF-06)
// ---------------------------------------------------------------------------
function Matriculas({ pessoa, turmas, avisar }: { pessoa: Pessoa; turmas: Turma[]; avisar: AoResultado }) {
  const nome = pessoa.nome_social ?? pessoa.email
  const matriculada = new Set(pessoa.matriculas.map((m) => m.turma_id))

  const alterar = useAcao(async ({ turma, marcar }: { turma: Turma; marcar: boolean }) => {
    const { error } = marcar
      ? await supabase.from('matriculas').insert({ estudante_id: pessoa.id, turma_id: turma.id })
      : await supabase.from('matriculas').delete().eq('estudante_id', pessoa.id).eq('turma_id', turma.id)
    if (error) throw error
    return marcar ? `Matrícula de ${nome} em ${turma.nome} registrada.` : `Matrícula de ${nome} em ${turma.nome} removida.`
  }, avisar)

  if (turmas.length === 0) return <p className="text-texto-suave">Nenhuma turma cadastrada.</p>

  return (
    <fieldset className="flex flex-col">
      <legend className="font-semibold">Turmas de {nome}</legend>
      {turmas.map((t) => (
        <Checkbox
          key={t.id}
          checked={matriculada.has(t.id)}
          disabled={alterar.isPending}
          onChange={(e) => alterar.mutate({ turma: t, marcar: e.target.checked })}
        >
          {t.nome} ({t.ano}){t.ativa ? '' : ' — inativa'}
        </Checkbox>
      ))}
    </fieldset>
  )
}

function CartaoAtiva({ pessoa, turmas, ehVoce, avisar }: { pessoa: Pessoa; turmas: Turma[]; ehVoce: boolean; avisar: AoResultado }) {
  const [papel, setPapel] = useState<Papel>(pessoa.papel)
  const [verMatriculas, setVerMatriculas] = useState(false)
  const idMatriculas = useId()
  const nome = pessoa.nome_social ?? pessoa.email

  const salvarPapel = useAcao(async (novo: Papel) => {
    const { error } = await supabase.rpc('definir_papel', { p_id: pessoa.id, p_papel: novo })
    if (error) throw error
    return `${nome} agora é ${ROTULO_PAPEL[novo]}.`
  }, avisar)

  const desativar = useAcao(async () => {
    await definirStatus(pessoa.id, 'inativo')
    return `Cadastro de ${nome} desativado.`
  }, avisar)

  const nomesTurmas = turmas.filter((t) => pessoa.matriculas.some((m) => m.turma_id === t.id)).map((t) => t.nome)

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="min-w-0">
          <Identificacao pessoa={pessoa} />
        </h2>
        <Etiqueta tom="marca">{ROTULO_PAPEL[pessoa.papel]}</Etiqueta>
      </div>
      {pessoa.papel === 'estudante' && (
        <p className="text-sm">
          <span className="font-semibold">Turmas:</span> {nomesTurmas.length ? nomesTurmas.join(', ') : 'nenhuma'}
        </p>
      )}

      {ehVoce ? (
        <p className="text-sm text-texto-suave">
          Esta é a sua conta. Para mudar o seu papel ou status, peça a outra pessoa da coordenação.
        </p>
      ) : (
        <>
          <form
            noValidate
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              salvarPapel.mutate(papel)
            }}
          >
            <Select
              rotulo="Papel"
              opcoes={OPCOES_PAPEL}
              value={papel}
              onChange={(e) => setPapel(e.target.value as Papel)}
            />
            <Button
              type="submit"
              variante="secundario"
              aria-label={`Salvar papel de ${nome}`}
              disabled={papel === pessoa.papel}
              carregando={salvarPapel.isPending}
              textoCarregando="Salvando…"
            >
              Salvar papel
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {pessoa.papel === 'estudante' && (
              <Button
                variante="secundario"
                aria-expanded={verMatriculas}
                aria-controls={idMatriculas}
                aria-label={`Matrículas de ${nome}`}
                onClick={() => setVerMatriculas((v) => !v)}
              >
                Matrículas
              </Button>
            )}
            <Confirmacao
              rotulo="Desativar"
              rotuloAcessivel={`Desativar ${nome}`}
              rotuloConfirmar="Confirmar desativação"
              aviso="A pessoa perde o acesso ao sistema até ser reativada. Os dados dela são mantidos."
              carregando={desativar.isPending}
              onConfirmar={() => desativar.mutate(undefined)}
            />
          </div>
          {pessoa.papel === 'estudante' && (
            <div id={idMatriculas} hidden={!verMatriculas}>
              {verMatriculas && <Matriculas pessoa={pessoa} turmas={turmas} avisar={avisar} />}
            </div>
          )}
        </>
      )}
    </Card>
  )
}

const FILTROS_PAPEL = [{ valor: 'todos', rotulo: 'Todos os papéis' }, ...OPCOES_PAPEL]

function Ativas({ pessoas, turmas, meuId, avisar }: { pessoas: Pessoa[]; turmas: Turma[]; meuId: string; avisar: AoResultado }) {
  const [filtro, setFiltro] = useState('todos')
  const visiveis = filtro === 'todos' ? pessoas : pessoas.filter((p) => p.papel === filtro)

  return (
    <>
      <div className="max-w-xs">
        <Select rotulo="Mostrar" opcoes={FILTROS_PAPEL} value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </div>
      {visiveis.length === 0 ? (
        <EmptyState titulo="Ninguém por aqui">
          <p>Não há pessoas ativas com esse papel.</p>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {visiveis.map((p) => (
            <li key={p.id}>
              <CartaoAtiva pessoa={p} turmas={turmas} ehVoce={p.id === meuId} avisar={avisar} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Inativas: reativar
// ---------------------------------------------------------------------------
function Inativas({ pessoas, avisar }: { pessoas: Pessoa[]; avisar: AoResultado }) {
  const reativar = useAcao(async (p: Pessoa) => {
    await definirStatus(p.id, 'ativo')
    return `Cadastro de ${p.nome_social ?? p.email} reativado.`
  }, avisar)

  if (pessoas.length === 0) {
    return (
      <EmptyState titulo="Nenhuma pessoa inativa">
        <p>Cadastros recusados ou desativados aparecem aqui.</p>
      </EmptyState>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {pessoas.map((p) => (
        <li key={p.id}>
          <Card className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="min-w-0">
                <Identificacao pessoa={p} />
              </h2>
              <Etiqueta>{ROTULO_PAPEL[p.papel]}</Etiqueta>
            </div>
            <Button
              variante="secundario"
              className="self-start"
              aria-label={`Reativar ${p.nome_social ?? p.email}`}
              carregando={reativar.isPending && reativar.variables?.id === p.id}
              onClick={() => reativar.mutate(p)}
            >
              Reativar
            </Button>
          </Card>
        </li>
      ))}
    </ul>
  )
}

/** /coordenacao/pessoas — aprovação em lote, papel, status e matrículas (RF-05, RF-06). */
export function Pessoas() {
  const { perfil } = useAuth()
  const pessoas = usePessoas()
  const turmas = useTurmas()
  const { resultado, avisar } = useResultado()

  const carregando = pessoas.isPending || turmas.isPending
  const erro = pessoas.isError || turmas.isError

  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Pessoas</h1>
      <Aviso tipo={resultado?.tipo}>{resultado?.texto}</Aviso>

      {carregando ? (
        <Carregando texto="Carregando pessoas…" />
      ) : erro ? (
        <ErroComRetry
          mensagem="Não foi possível carregar as pessoas."
          onTentarDeNovo={() => {
            void pessoas.refetch()
            void turmas.refetch()
          }}
        />
      ) : (
        <Abas
          rotulo="Situação do cadastro"
          abas={ABAS.map((a) => ({
            ...a,
            rotulo: `${a.rotulo} (${pessoas.data.filter((p) => p.status === STATUS_DA_ABA[a.id]).length})`,
          }))}
        >
          {(aba) => {
            const daAba = pessoas.data.filter((p) => p.status === STATUS_DA_ABA[aba])
            if (aba === 'pendentes') return <Pendentes pessoas={daAba} turmas={turmas.data} avisar={avisar} />
            if (aba === 'ativas') return <Ativas pessoas={daAba} turmas={turmas.data} meuId={perfil?.id ?? ''} avisar={avisar} />
            return <Inativas pessoas={daAba} avisar={avisar} />
          }}
        </Abas>
      )}
    </>
  )
}

const STATUS_DA_ABA = { pendentes: 'pendente', ativas: 'ativo', inativas: 'inativo' } as const
