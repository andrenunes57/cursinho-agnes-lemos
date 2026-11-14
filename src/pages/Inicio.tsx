import { useAuth } from '../auth/contexto'
import { ContadoresInicio } from './coordenacao/ContadoresInicio'
import { InicioDocente, InicioEstudante } from './InicioAulas'

/** / — Início por papel (SPEC §11). Tarefas e entregas entram na F5. */
export function Inicio() {
  const { perfil } = useAuth()
  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Boas-vindas, {perfil?.nome_social}!</h1>
      {perfil?.papel === 'estudante' && <InicioEstudante />}
      {perfil?.papel === 'professor' && <InicioDocente />}
      {perfil?.papel === 'coordenacao' && (
        <>
          <ContadoresInicio />
          <InicioDocente somenteSeHouver />
        </>
      )}
    </>
  )
}
