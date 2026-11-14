import { useId, useRef, useState, type FormEvent } from 'react'
import { DEVOLUTIVA_MAX, formatarNota, lerNota, validarMaximo, validarNota } from '../lib/validacoes'
import type { Entrega, TipoAvaliacao } from '../pages/consultasTarefas'
import { Button } from './ui/Button'
import { Field } from './ui/Field'
import { MensagemErro } from './ui/MensagemErro'
import { TextArea } from './ui/TextArea'

export type DadosAvaliacao = { nota: number | null; conceito: string | null; devolutiva: string | null }

type Props = {
  tipo: TipoAvaliacao
  /** Conceitos da tarefa (tipo `conceito`). */
  conceitos: string[] | null
  /** Avaliação atual, para reavaliar (RF-18). */
  inicial?: Pick<Entrega, 'nota' | 'conceito' | 'devolutiva' | 'avaliada_em'>
  enviando: boolean
  onEnviar: (dados: DadosAvaliacao) => void
}

/**
 * Avaliação de uma entrega conforme o tipo da tarefa (RF-18, §9.4 `avaliar_entrega`):
 * nota de 0 a 10, um conceito da lista ou só a devolutiva. A devolutiva em texto é sempre possível
 * e é obrigatória no tipo `devolutiva`.
 */
export function AvaliacaoForm({ tipo, conceitos, inicial, enviando, onEnviar }: Props) {
  const id = useId()
  const [nota, setNota] = useState(inicial?.nota != null ? formatarNota(inicial.nota) : '')
  const [conceito, setConceito] = useState(inicial?.conceito ?? '')
  const [devolutiva, setDevolutiva] = useState(inicial?.devolutiva ?? '')
  const [tentou, setTentou] = useState(false)

  const refNota = useRef<HTMLInputElement>(null)
  const refConceito = useRef<HTMLInputElement>(null)
  const refDevolutiva = useRef<HTMLTextAreaElement>(null)

  const erros = {
    nota: tipo === 'nota' ? validarNota(nota) : null,
    conceito: tipo === 'conceito' && !(conceitos ?? []).includes(conceito) ? 'Escolha um conceito.' : null,
    devolutiva:
      validarMaximo(devolutiva, DEVOLUTIVA_MAX) ??
      (tipo === 'devolutiva' && !devolutiva.trim() ? 'Escreva a devolutiva.' : null),
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTentou(true)
    if (erros.nota) return refNota.current?.focus()
    if (erros.conceito) return refConceito.current?.focus()
    if (erros.devolutiva) return refDevolutiva.current?.focus()
    onEnviar({
      nota: tipo === 'nota' ? lerNota(nota) : null,
      conceito: tipo === 'conceito' ? conceito : null,
      devolutiva: devolutiva.trim() || null,
    })
  }

  const erro = (campo: keyof typeof erros) => (tentou ? erros[campo] : null)
  const idErroConceito = `${id}-erro-conceito`

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      {tipo === 'nota' && (
        <Field
          ref={refNota}
          rotulo="Nota"
          dica="De 0 a 10, com até uma casa decimal (ex.: 7,5)."
          obrigatorio
          inputMode="decimal"
          autoComplete="off"
          className="max-w-32"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          erro={erro('nota')}
        />
      )}

      {tipo === 'conceito' && (
        <fieldset className="flex flex-col gap-1" aria-describedby={erro('conceito') ? idErroConceito : undefined}>
          <legend className="font-semibold">
            Conceito<span aria-hidden="true"> *</span>
            <span className="sr-only"> (obrigatório)</span>
          </legend>
          <div className="flex flex-col">
            {(conceitos ?? []).map((opcao, i) => (
              <label key={opcao} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  ref={i === 0 ? refConceito : undefined}
                  type="radio"
                  name={`${id}-conceito`}
                  value={opcao}
                  checked={conceito === opcao}
                  onChange={() => setConceito(opcao)}
                  aria-invalid={erro('conceito') ? true : undefined}
                  className="size-5 accent-marca"
                />
                {opcao}
              </label>
            ))}
          </div>
          {erro('conceito') && <MensagemErro id={idErroConceito}>{erro('conceito')}</MensagemErro>}
        </fieldset>
      )}

      <TextArea
        ref={refDevolutiva}
        rotulo="Devolutiva"
        dica={
          tipo === 'devolutiva'
            ? 'O retorno em texto para a pessoa estudante.'
            : 'Opcional. Um retorno em texto para a pessoa estudante.'
        }
        obrigatorio={tipo === 'devolutiva'}
        rows={4}
        value={devolutiva}
        onChange={(e) => setDevolutiva(e.target.value)}
        erro={erro('devolutiva')}
      />

      <div>
        <Button type="submit" carregando={enviando} textoCarregando="Salvando…">
          {inicial?.avaliada_em ? 'Atualizar avaliação' : 'Salvar avaliação'}
        </Button>
      </div>
    </form>
  )
}
