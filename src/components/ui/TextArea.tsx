import { useId, type Ref, type TextareaHTMLAttributes } from 'react'
import { MensagemErro } from './MensagemErro'

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  rotulo: string
  dica?: string
  erro?: string | null
  obrigatorio?: boolean
  ref?: Ref<HTMLTextAreaElement>
}

/** Área de texto com <label>, dica e erro ligados por aria-describedby (SPEC §5.3). */
export function TextArea({ rotulo, dica, erro, obrigatorio = false, className = '', ref, rows = 5, ...resto }: Props) {
  const id = useId()
  const idDica = `${id}-dica`
  const idErro = `${id}-erro`
  const descritores = [dica ? idDica : null, erro ? idErro : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {rotulo}
        {obrigatorio && <span aria-hidden="true"> *</span>}
        {obrigatorio && <span className="sr-only"> (obrigatório)</span>}
      </label>
      {dica && (
        <p id={idDica} className="text-sm text-texto-suave">
          {dica}
        </p>
      )}
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores}
        aria-required={obrigatorio || undefined}
        className={`rounded-lg border-2 bg-superficie px-3 py-2 text-base ${erro ? 'border-erro' : 'border-borda-forte'} ${className}`}
        {...resto}
      />
      {erro && <MensagemErro id={idErro}>{erro}</MensagemErro>}
    </div>
  )
}
