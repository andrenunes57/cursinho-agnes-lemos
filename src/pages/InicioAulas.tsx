import { Link } from 'react-router'
import { useAuth } from '../auth/contexto'
import { CartaoAula } from '../components/CartaoAula'
import { Carregando } from '../components/ui/Carregando'
import { EmptyState } from '../components/ui/EmptyState'
import { ErroComRetry } from '../components/ui/ErroComRetry'
import { hojeSP } from '../lib/datas'
import { separarPorData, useAulas, useNomeDocente, type Aula } from './consultasAulas'

const QUANTAS = 5
const classeLink = 'min-h-11 content-center self-start font-semibold text-marca underline underline-offset-4'

function Lista({ aulas, para, hoje, docente }: { aulas: Aula[]; para: (a: Aula) => string; hoje: string; docente?: (a: Aula) => string }) {
  return (
    <ul className="flex flex-col gap-3">
      {aulas.map((a) => (
        <li key={a.id}>
          <CartaoAula aula={a} para={para(a)} hoje={hoje} docente={docente?.(a)} />
        </li>
      ))}
    </ul>
  )
}

/** Início da estudante: aulas de hoje e as próximas (SPEC §11). Tarefas pendentes chegam na F5. */
export function InicioEstudante() {
  const { perfil } = useAuth()
  const aulas = useAulas('turmas', perfil?.id)
  const nomeDocente = useNomeDocente()
  const hoje = hojeSP()

  if (aulas.isPending) return <Carregando texto="Carregando suas aulas…" />
  if (aulas.isError) {
    return <ErroComRetry mensagem="Não foi possível carregar suas aulas." onTentarDeNovo={() => void aulas.refetch()} />
  }

  const { proximas } = separarPorData(aulas.data, hoje)
  const deHoje = proximas.filter((a) => a.data === hoje)
  const seguintes = proximas.filter((a) => a.data > hoje).slice(0, QUANTAS)
  const para = (a: Aula) => `/aulas/${a.id}`
  const docente = (a: Aula) => nomeDocente(a.professor_id)

  return (
    <>
      <section aria-labelledby="titulo-hoje" className="flex flex-col gap-3">
        <h2 id="titulo-hoje" className="text-xl font-semibold">
          Aulas de hoje
        </h2>
        {deHoje.length === 0 ? (
          <EmptyState titulo="Nenhuma aula hoje" />
        ) : (
          <Lista aulas={deHoje} para={para} hoje={hoje} docente={docente} />
        )}
      </section>
      <section aria-labelledby="titulo-seguintes" className="flex flex-col gap-3">
        <h2 id="titulo-seguintes" className="text-xl font-semibold">
          Próximas aulas
        </h2>
        {seguintes.length === 0 ? (
          <EmptyState titulo="Nenhuma aula marcada depois de hoje" />
        ) : (
          <Lista aulas={seguintes} para={para} hoje={hoje} docente={docente} />
        )}
        <Link to="/aulas" className={classeLink}>
          Ver todas as aulas
        </Link>
      </section>
    </>
  )
}

/**
 * Início docente: as próximas aulas da pessoa (SPEC §11). Entregas aguardando avaliação chegam
 * na F5. Para a coordenação, só aparece quando ela tem aulas próximas.
 */
export function InicioDocente({ somenteSeHouver = false }: { somenteSeHouver?: boolean }) {
  const { perfil } = useAuth()
  const aulas = useAulas('minhas', perfil?.id)
  const hoje = hojeSP()

  if (aulas.isPending) return somenteSeHouver ? null : <Carregando texto="Carregando suas aulas…" />
  if (aulas.isError) {
    return somenteSeHouver ? null : (
      <ErroComRetry mensagem="Não foi possível carregar suas aulas." onTentarDeNovo={() => void aulas.refetch()} />
    )
  }

  const proximas = separarPorData(aulas.data, hoje).proximas.slice(0, QUANTAS)
  if (somenteSeHouver && proximas.length === 0) return null

  return (
    <section aria-labelledby="titulo-minhas-proximas" className="flex flex-col gap-3">
      <h2 id="titulo-minhas-proximas" className="text-xl font-semibold">
        Suas próximas aulas
      </h2>
      {proximas.length === 0 ? (
        <EmptyState titulo="Nenhuma aula marcada">
          <p>Crie a próxima em Minhas aulas.</p>
        </EmptyState>
      ) : (
        <Lista aulas={proximas} para={(a) => `/docente/aulas/${a.id}`} hoje={hoje} />
      )}
      <Link to="/docente/aulas" className={classeLink}>
        Ver minhas aulas
      </Link>
    </section>
  )
}
