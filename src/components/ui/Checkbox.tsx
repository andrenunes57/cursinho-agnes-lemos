import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { MensagemErro } from './MensagemErro'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> & {
  children: ReactNode
  erro?: string | null
  ref?: Ref<HTMLInputElement>
}

/** Caixa de seleção com rótulo clicável e erro anunciado em texto (SPEC §5.3). */
export function Checkbox({ children, erro, ref, ...resto }: Props) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <input
          id={id}
          ref={ref}
          type="checkbox"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${id}-erro` : undefined}
          className="mt-2.5 size-5 shrink-0 accent-marca"
          {...resto}
        />
        <label htmlFor={id} className="py-2">
          {children}
        </label>
      </div>
      {erro && <MensagemErro id={`${id}-erro`}>{erro}</MensagemErro>}
    </div>
  )
}
