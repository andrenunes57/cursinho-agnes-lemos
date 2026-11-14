import { useAuth } from '../auth/contexto'
import { EmptyState } from '../components/ui/EmptyState'

/** / — Início. O conteúdo por papel (agenda, pendências, contadores) entra nas fases F3 a F6. */
export function Inicio() {
  const { perfil } = useAuth()
  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Boas-vindas, {perfil?.nome_social}!</h1>
      <EmptyState titulo="Ainda não há nada por aqui">
        <p>Use o menu para navegar. As próximas aulas e pendências vão aparecer nesta tela.</p>
      </EmptyState>
    </>
  )
}
