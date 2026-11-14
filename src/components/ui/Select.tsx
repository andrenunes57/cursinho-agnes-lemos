import { useId, type Ref, type SelectHTMLAttributes } from 'react'
import { MensagemErro } from './MensagemErro'

export type OpcaoSelect = { valor: string; rotulo: string }

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'children'> & {
  rotulo: string
  opcoes: readonly OpcaoSelect[]
  /** Primeira opção, de valor vazio (ex.: "Escolha a turma"). */
  vazio?: string
  dica?: string
  erro?: string | null
  obrigatorio?: boolean
  ref?: Ref<HTMLSelectElement>
}

/** <select> com <label>, dica e erro ligados por aria-describedby (SPEC §5.3). */
export function Select({ rotulo, opcoes, vazio, dica, erro, obrigatorio = false, className = '', ref, ...resto }: Props) {
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
      <select
        id={id}
        ref={ref}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores}
        aria-required={obrigatorio || undefined}
        className={`min-h-11 rounded-lg border-2 bg-superficie px-3 text-base ${erro ? 'border-erro' : 'border-borda-forte'} ${className}`}
        {...resto}
      >
        {vazio !== undefined && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {erro && <MensagemErro id={idErro}>{erro}</MensagemErro>}
    </div>
  )
}
