import { useAuth } from '../auth/contexto'
import { EmptyState } from '../components/ui/EmptyState'
import { ContadoresInicio } from './coordenacao/ContadoresInicio'

/** / — Início. Coordenação vê os contadores (F3); estudante e docente ganham conteúdo nas F4 a F6. */
export function Inicio() {
  const { perfil } = useAuth()
  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Boas-vindas, {perfil?.nome_social}!</h1>
      {perfil?.papel === 'coordenacao' ? (
        <ContadoresInicio />
      ) : (
        <EmptyState titulo="Ainda não há nada por aqui">
          <p>Use o menu para navegar. As próximas aulas e pendências vão aparecer nesta tela.</p>
        </EmptyState>
      )}
    </>
  )
}
