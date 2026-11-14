import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'

export type Aba<T extends string> = { id: T; rotulo: string }

type Props<T extends string> = {
  /** Nome do conjunto de abas, lido pelo leitor de tela. */
  rotulo: string
  abas: readonly Aba<T>[]
  /** Parâmetro da URL que guarda a aba ativa (recarregar a página mantém a aba). */
  parametro?: string
  children: (ativa: T) => ReactNode
}

/**
 * Abas no padrão ARIA (tablist/tab/tabpanel): só a aba ativa entra no Tab; as setas, Home e End
 * trocam de aba (SPEC §5.3). A aba ativa fica em `?aba=`.
 */
export function Abas<T extends string>({ rotulo, abas, parametro = 'aba', children }: Props<T>) {
  const [params, setParams] = useSearchParams()
  const base = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const ativa = abas.find((a) => a.id === params.get(parametro))?.id ?? abas[0].id
  const indiceAtivo = abas.findIndex((a) => a.id === ativa)

  function selecionar(indice: number, focar: boolean) {
    const aba = abas[indice]
    setParams(
      (atual) => {
        atual.set(parametro, aba.id)
        return atual
      },
      { replace: true },
    )
    if (focar) refs.current[indice]?.focus()
  }

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    const ultimo = abas.length - 1
    const destinos: Record<string, number> = {
      ArrowRight: indiceAtivo === ultimo ? 0 : indiceAtivo + 1,
      ArrowLeft: indiceAtivo === 0 ? ultimo : indiceAtivo - 1,
      Home: 0,
      End: ultimo,
    }
    if (!(evento.key in destinos)) return
    evento.preventDefault()
    selecionar(destinos[evento.key], true)
  }

  const idAba = (id: string) => `${base}-aba-${id}`
  const idPainel = `${base}-painel`

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={rotulo} onKeyDown={aoTeclar} className="flex gap-1 overflow-x-auto border-b-2 border-borda">
        {abas.map((aba, i) => {
          const selecionada = aba.id === ativa
          return (
            <button
              key={aba.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="tab"
              id={idAba(aba.id)}
              aria-selected={selecionada}
              aria-controls={idPainel}
              tabIndex={selecionada ? 0 : -1}
              onClick={() => selecionar(i, false)}
              className={`-mb-0.5 min-h-11 shrink-0 border-b-4 px-4 font-semibold ${
                selecionada ? 'border-marca text-marca' : 'border-transparent text-texto-suave hover:text-marca'
              }`}
            >
              {aba.rotulo}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={idPainel} aria-labelledby={idAba(ativa)} className="flex flex-col gap-4">
        {children(ativa)}
      </div>
    </div>
  )
}
