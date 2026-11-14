import { Link } from 'react-router'
import { EmptyState } from '../components/ui/EmptyState'

/** Página provisória das rotas que chegam nas fases F3 a F6 (SPEC §13). */
export function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <>
      <h1 className="text-3xl font-bold text-marca">{titulo}</h1>
      <EmptyState titulo="Esta tela está em construção">
        <p>
          Ela chega numa próxima versão do sistema.{' '}
          <Link to="/" className="font-semibold text-marca underline underline-offset-4">
            Voltar para o início
          </Link>
        </p>
      </EmptyState>
    </>
  )
}
