import { useState } from 'react'
import { separarPorData, type Aula } from '../pages/consultasAulas'
import { CartaoAula } from './CartaoAula'
import { Button } from './ui/Button'
import { EmptyState } from './ui/EmptyState'

const POR_PAGINA = 10

type Props = {
  aulas: Aula[]
  hoje: string
  para: (aula: Aula) => string
  docente?: (aula: Aula) => string
  mostrarTurma?: boolean
  /** Texto do estado vazio das próximas aulas. */
  semProximas: string
}

/** Próximas aulas (mais cedo primeiro) e anteriores (mais recente primeiro, 10 por vez). */
export function ListaAulas({ aulas, hoje, para, docente, mostrarTurma, semProximas }: Props) {
  const { proximas, anteriores } = separarPorData(aulas, hoje)
  const [quantasAnteriores, setQuantasAnteriores] = useState(POR_PAGINA)

  const cartao = (a: Aula) => (
    <li key={a.id}>
      <CartaoAula aula={a} para={para(a)} hoje={hoje} docente={docente?.(a)} mostrarTurma={mostrarTurma} />
    </li>
  )

  return (
    <>
      <section aria-labelledby="titulo-proximas" className="flex flex-col gap-3">
        <h2 id="titulo-proximas" className="text-xl font-semibold">
          Próximas aulas
        </h2>
        {proximas.length === 0 ? (
          <EmptyState titulo="Nenhuma aula marcada">
            <p>{semProximas}</p>
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">{proximas.map(cartao)}</ul>
        )}
      </section>

      {anteriores.length > 0 && (
        <section aria-labelledby="titulo-anteriores" className="flex flex-col gap-3">
          <h2 id="titulo-anteriores" className="text-xl font-semibold">
            Aulas anteriores
          </h2>
          <ul className="flex flex-col gap-3">{anteriores.slice(0, quantasAnteriores).map(cartao)}</ul>
          {anteriores.length > quantasAnteriores && (
            <Button variante="secundario" className="self-start" onClick={() => setQuantasAnteriores((n) => n + POR_PAGINA)}>
              Mostrar mais aulas anteriores
            </Button>
          )}
        </section>
      )}
    </>
  )
}
