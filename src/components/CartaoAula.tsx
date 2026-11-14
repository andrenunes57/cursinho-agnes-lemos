import { Link } from 'react-router'
import { formatarQuando } from '../lib/datas'
import type { Aula } from '../pages/consultasAulas'
import { Etiqueta } from './ui/Etiqueta'

type Props = {
  aula: Aula
  /** Rota de detalhe (/aulas/:id ou /docente/aulas/:id). */
  para: string
  hoje: string
  /** Nome + pronomes de quem dá a aula (visão da estudante). */
  docente?: string
  /** Mostra a turma (visão docente, que pode lecionar em várias). */
  mostrarTurma?: boolean
}

/** Cartão de aula numa lista; o título é o link para o detalhe. */
export function CartaoAula({ aula, para, hoje, docente, mostrarTurma = false }: Props) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 text-lg font-semibold break-words">
          <Link to={para} className="text-marca underline underline-offset-4 hover:text-marca-escura">
            {aula.titulo}
          </Link>
        </h3>
        {aula.data === hoje && <Etiqueta tom="marca">Hoje</Etiqueta>}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="font-semibold">Quando</dt>
        <dd>{formatarQuando(aula.data, aula.inicio)}</dd>
        <dt className="font-semibold">Disciplina</dt>
        <dd>{aula.disciplina}</dd>
        {mostrarTurma && (
          <>
            <dt className="font-semibold">Turma</dt>
            <dd>{aula.turma}</dd>
          </>
        )}
        {docente && (
          <>
            <dt className="font-semibold">Docente</dt>
            <dd>{docente}</dd>
          </>
        )}
      </dl>
    </article>
  )
}
