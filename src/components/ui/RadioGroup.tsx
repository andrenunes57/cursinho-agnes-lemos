import { useId, type ReactNode } from 'react'

type Opcao<T extends string> = { valor: T; rotulo: string }

type Props<T extends string> = {
  legenda: string
  nome: string
  opcoes: readonly Opcao<T>[]
  valor: T
  onChange: (valor: T) => void
  dica?: string
  /** Conteúdo extra logo abaixo das opções (ex.: campo "outro"). */
  children?: ReactNode
}

/** Grupo de rádios em <fieldset> com <legend> (SPEC §5.3). */
export function RadioGroup<T extends string>({ legenda, nome, opcoes, valor, onChange, dica, children }: Props<T>) {
  const id = useId()
  return (
    <fieldset className="flex flex-col gap-1" aria-describedby={dica ? `${id}-dica` : undefined}>
      <legend className="font-semibold">{legenda}</legend>
      {dica && (
        <p id={`${id}-dica`} className="text-sm text-texto-suave">
          {dica}
        </p>
      )}
      <div className="flex flex-col">
        {opcoes.map((opcao) => (
          <label key={opcao.valor} className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={valor === opcao.valor}
              onChange={() => onChange(opcao.valor)}
              className="size-5 accent-marca"
            />
            {opcao.rotulo}
          </label>
        ))}
      </div>
      {children}
    </fieldset>
  )
}
