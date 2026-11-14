import { useId, type InputHTMLAttributes, type Ref } from 'react'
import { MensagemErro } from './MensagemErro'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  rotulo: string
  dica?: string
  erro?: string | null
  obrigatorio?: boolean
  ref?: Ref<HTMLInputElement>
}

/**
 * Campo de texto com <label>, dica e erro ligados por aria-describedby (SPEC §5.3).
 * O erro aparece em texto, nunca só pela cor.
 */
export function Field({ rotulo, dica, erro, obrigatorio = false, className = '', ref, ...resto }: Props) {
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
      <input
        id={id}
        ref={ref}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores}
        aria-required={obrigatorio || undefined}
        className={`min-h-11 rounded-lg border-2 bg-superficie px-3 text-base ${erro ? 'border-erro' : 'border-borda-forte'} ${className}`}
        {...resto}
      />
      {erro && <MensagemErro id={idErro}>{erro}</MensagemErro>}
    </div>
  )
}
