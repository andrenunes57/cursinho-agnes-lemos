import { useRef, useState, type FormEvent } from 'react'
import { isoParaCampoPrazo, prazoParaISO } from '../lib/datas'
import {
  CONCEITOS_PADRAO,
  INSTRUCOES_MAX,
  TITULO_TAREFA_MAX,
  conceitosDoTexto,
  validarConceitos,
  validarMaximo,
  validarTituloTarefa,
} from '../lib/validacoes'
import { ROTULO_AVALIACAO, type Tarefa, type TipoAvaliacao } from '../pages/consultasTarefas'
import { Button } from './ui/Button'
import { Checkbox } from './ui/Checkbox'
import { Field } from './ui/Field'
import { RadioGroup } from './ui/RadioGroup'
import { TextArea } from './ui/TextArea'

export type DadosTarefa = {
  titulo: string
  instrucoes: string | null
  /** ISO (timestamptz) ou null, sem prazo. */
  prazo: string | null
  tipo_avaliacao: TipoAvaliacao
  /** Só para o tipo `conceito`. */
  opcoes_conceito: string[] | null
  publicada: boolean
}

const OPCOES_TIPO = (['nota', 'conceito', 'devolutiva'] as const).map((valor) => ({ valor, rotulo: ROTULO_AVALIACAO[valor] }))

type Props = {
  /** Tarefa em edição; sem ela, o formulário cria uma nova. */
  inicial?: Tarefa
  /**
   * Já há entrega avaliada: tipo e conceitos ficam travados, para não deixar avaliações antigas
   * fora das regras da tarefa (decisão da F5, SPEC §19).
   */
  avaliacaoTravada?: boolean
  enviando: boolean
  textoBotao: string
  onEnviar: (dados: DadosTarefa) => void
  onCancelar: () => void
}

/** Criar ou editar uma tarefa da aula (RF-15). */
export function TarefaForm({ inicial, avaliacaoTravada = false, enviando, textoBotao, onEnviar, onCancelar }: Props) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [instrucoes, setInstrucoes] = useState(inicial?.instrucoes ?? '')
  const [prazo, setPrazo] = useState(inicial?.prazo ? isoParaCampoPrazo(inicial.prazo) : '')
  const [tipo, setTipo] = useState<TipoAvaliacao>(inicial?.tipo_avaliacao ?? 'nota')
  const [conceitos, setConceitos] = useState((inicial?.opcoes_conceito ?? CONCEITOS_PADRAO).join('\n'))
  const [publicar, setPublicar] = useState(false)
  const [tentou, setTentou] = useState(false)

  const refTitulo = useRef<HTMLInputElement>(null)
  const refInstrucoes = useRef<HTMLTextAreaElement>(null)
  const refPrazo = useRef<HTMLInputElement>(null)
  const refConceitos = useRef<HTMLTextAreaElement>(null)

  const erros = {
    titulo: validarTituloTarefa(titulo),
    instrucoes: validarMaximo(instrucoes, INSTRUCOES_MAX),
    prazo: prazo && !prazoParaISO(prazo) ? 'Informe a data e a hora completas do prazo, ou deixe em branco.' : null,
    conceitos: tipo === 'conceito' && !avaliacaoTravada ? validarConceitos(conceitos) : null,
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTentou(true)
    // Foco no primeiro campo com erro, na ordem visual (SPEC §5.3).
    if (erros.titulo) return refTitulo.current?.focus()
    if (erros.instrucoes) return refInstrucoes.current?.focus()
    if (erros.prazo) return refPrazo.current?.focus()
    if (erros.conceitos) return refConceitos.current?.focus()

    onEnviar({
      titulo: titulo.trim(),
      instrucoes: instrucoes.trim() || null,
      prazo: prazo ? prazoParaISO(prazo) : null,
      tipo_avaliacao: tipo,
      opcoes_conceito: tipo === 'conceito' ? conceitosDoTexto(conceitos) : null,
      publicada: publicar,
    })
  }

  const erro = (campo: keyof typeof erros) => (tentou ? erros[campo] : null)

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      <Field
        ref={refTitulo}
        rotulo="Título da tarefa"
        dica={`Ex.: Lista de exercícios 1. Até ${TITULO_TAREFA_MAX} caracteres.`}
        obrigatorio
        autoComplete="off"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        erro={erro('titulo')}
      />
      <TextArea
        ref={refInstrucoes}
        rotulo="Instruções"
        dica="O que a turma deve fazer e como entregar. Links começando com https:// ficam clicáveis."
        rows={5}
        value={instrucoes}
        onChange={(e) => setInstrucoes(e.target.value)}
        erro={erro('instrucoes')}
      />
      <Field
        ref={refPrazo}
        rotulo="Prazo"
        dica="Opcional. Horário de Brasília. Entregas depois do prazo são aceitas e aparecem como atrasadas."
        type="datetime-local"
        value={prazo}
        onChange={(e) => setPrazo(e.target.value)}
        erro={erro('prazo')}
      />

      {avaliacaoTravada ? (
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Tipo de avaliação: {ROTULO_AVALIACAO[tipo]}</p>
          {tipo === 'conceito' && <p>Conceitos: {(inicial?.opcoes_conceito ?? []).join(', ')}</p>}
          <p className="text-sm text-texto-suave">
            Já há entrega avaliada nesta tarefa, então o tipo de avaliação e os conceitos não mudam mais.
          </p>
        </div>
      ) : (
        <RadioGroup legenda="Tipo de avaliação" nome="tipo-avaliacao" opcoes={OPCOES_TIPO} valor={tipo} onChange={setTipo}>
          {tipo === 'conceito' && (
            <TextArea
              ref={refConceitos}
              rotulo="Conceitos possíveis"
              dica="Um por linha, na ordem em que devem aparecer. Ex.: Satisfatório, Precisa revisar."
              obrigatorio
              rows={4}
              value={conceitos}
              onChange={(e) => setConceitos(e.target.value)}
              erro={erro('conceitos')}
            />
          )}
        </RadioGroup>
      )}

      {!inicial && (
        <Checkbox checked={publicar} onChange={(e) => setPublicar(e.target.checked)}>
          Publicar agora (a turma já vê a tarefa e pode entregar)
        </Checkbox>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" carregando={enviando} textoCarregando="Salvando…">
          {textoBotao}
        </Button>
        <Button variante="discreto" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
