import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { Aviso } from '../../components/ui/Aviso'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Carregando } from '../../components/ui/Carregando'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { Etiqueta } from '../../components/ui/Etiqueta'
import { Field } from '../../components/ui/Field'
import { mensagemDeErro } from '../../lib/erros'
import { supabase } from '../../lib/supabase'
import { validarNomeDisciplina } from '../../lib/validacoes'
import { useResultado, type AoResultado } from './comum'
import { chaves, useDisciplinas, type Disciplina } from './consultas'

const DUPLICADA = 'Já existe uma disciplina com esse nome.'

function FormDisciplina({
  inicial = '',
  textoBotao,
  enviando,
  onEnviar,
  onCancelar,
}: {
  inicial?: string
  textoBotao: string
  enviando: boolean
  onEnviar: (nome: string) => void
  onCancelar: () => void
}) {
  const [nome, setNome] = useState(inicial)
  const [tentou, setTentou] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const erro = validarNomeDisciplina(nome)

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTentou(true)
    if (erro) return ref.current?.focus()
    onEnviar(nome.trim())
  }

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      <Field
        ref={ref}
        rotulo="Nome da disciplina"
        dica="Ex.: Matemática, Redação"
        obrigatorio
        autoComplete="off"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        erro={tentou ? erro : null}
      />
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

function useSalvar<T>(fn: (v: T) => Promise<string>, avisar: AoResultado, aoConcluir?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async (texto) => {
      await qc.invalidateQueries({ queryKey: chaves.disciplinas })
      aoConcluir?.()
      avisar({ tipo: 'sucesso', texto })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro, DUPLICADA) }),
  })
}

function CartaoDisciplina({ disciplina, avisar }: { disciplina: Disciplina; avisar: AoResultado }) {
  const [editando, setEditando] = useState(false)

  const renomear = useSalvar(
    async (nome: string) => {
      const { error } = await supabase.from('disciplinas').update({ nome }).eq('id', disciplina.id)
      if (error) throw error
      return `Disciplina ${nome} atualizada.`
    },
    avisar,
    () => setEditando(false),
  )

  const alternar = useSalvar(async () => {
    const ativa = !disciplina.ativa
    const { error } = await supabase.from('disciplinas').update({ ativa }).eq('id', disciplina.id)
    if (error) throw error
    return ativa ? `Disciplina ${disciplina.nome} ativada.` : `Disciplina ${disciplina.nome} desativada.`
  }, avisar)

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold">{disciplina.nome}</h2>
        <Etiqueta tom={disciplina.ativa ? 'sucesso' : 'neutro'}>{disciplina.ativa ? 'Ativa' : 'Inativa'}</Etiqueta>
      </div>
      {editando ? (
        <FormDisciplina
          inicial={disciplina.nome}
          textoBotao="Salvar disciplina"
          enviando={renomear.isPending}
          onEnviar={(nome) => renomear.mutate(nome)}
          onCancelar={() => setEditando(false)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variante="secundario" aria-label={`Editar ${disciplina.nome}`} onClick={() => setEditando(true)}>
            Editar
          </Button>
          <Button
            variante="secundario"
            aria-label={`${disciplina.ativa ? 'Desativar' : 'Ativar'} ${disciplina.nome}`}
            carregando={alternar.isPending}
            textoCarregando="Salvando…"
            onClick={() => alternar.mutate(undefined)}
          >
            {disciplina.ativa ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      )}
    </Card>
  )
}

/** /coordenacao/disciplinas — criar, editar e ativar/desativar (RF-08). */
export function Disciplinas() {
  const disciplinas = useDisciplinas()
  const { resultado, avisar } = useResultado()
  const [criando, setCriando] = useState(false)

  const criar = useSalvar(
    async (nome: string) => {
      const { error } = await supabase.from('disciplinas').insert({ nome })
      if (error) throw error
      return `Disciplina ${nome} criada.`
    },
    avisar,
    () => setCriando(false),
  )

  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Disciplinas</h1>
      <p className="text-texto-suave">
        Disciplinas inativas não aparecem para novas aulas, mas continuam nas aulas já cadastradas.
      </p>
      <Aviso tipo={resultado?.tipo}>{resultado?.texto}</Aviso>

      {criando ? (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nova disciplina</h2>
          <FormDisciplina
            textoBotao="Criar disciplina"
            enviando={criar.isPending}
            onEnviar={(nome) => criar.mutate(nome)}
            onCancelar={() => setCriando(false)}
          />
        </Card>
      ) : (
        <Button className="self-start" onClick={() => setCriando(true)}>
          Nova disciplina
        </Button>
      )}

      {disciplinas.isPending ? (
        <Carregando texto="Carregando disciplinas…" />
      ) : disciplinas.isError ? (
        <ErroComRetry
          mensagem="Não foi possível carregar as disciplinas."
          onTentarDeNovo={() => void disciplinas.refetch()}
        />
      ) : disciplinas.data.length === 0 ? (
        <EmptyState titulo="Nenhuma disciplina cadastrada">
          <p>Use “Nova disciplina” para criar a primeira (ex.: Matemática).</p>
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-3 largo:grid-cols-2">
          {disciplinas.data.map((d) => (
            <li key={d.id}>
              <CartaoDisciplina disciplina={d} avisar={avisar} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
