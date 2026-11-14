import { Link } from 'react-router'
import { useAuth } from '../auth/contexto'
import { CartaoAula } from '../components/CartaoAula'
import { CartaoTarefa } from '../components/CartaoTarefa'
import { Carregando } from '../components/ui/Carregando'
import { EmptyState } from '../components/ui/EmptyState'
import { ErroComRetry } from '../components/ui/ErroComRetry'
import { hojeSP } from '../lib/datas'
import { separarPorData, useAulas, useNomeDocente, type Aula } from './consultasAulas'
import { porPrazo, situacaoDaEntrega, useEntregasAguardando, useMinhasTarefas } from './consultasTarefas'

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

/** Tarefas ainda sem entrega, pelo prazo mais próximo (Início da estudante). */
function TarefasPendentes({ uid }: { uid: string | undefined }) {
  const tarefas = useMinhasTarefas(uid)
  let conteudo
  if (tarefas.isPending) conteudo = <Carregando texto="Carregando suas tarefas…" />
  else if (tarefas.isError) {
    conteudo = <ErroComRetry mensagem="Não foi possível carregar suas tarefas." onTentarDeNovo={() => void tarefas.refetch()} />
  } else {
    const pendentes = tarefas.data.filter((t) => situacaoDaEntrega(t.entregas[0], t.prazo) === 'pendente').sort(porPrazo)
    conteudo =
      pendentes.length === 0 ? (
        <EmptyState titulo="Nenhuma tarefa pendente" />
      ) : (
        <ul className="flex flex-col gap-3">
          {pendentes.slice(0, QUANTAS).map((t) => (
            <li key={t.id}>
              <CartaoTarefa
                tarefa={t}
                situacao="pendente"
                aula={{ titulo: t.aulas.titulo, data: t.aulas.data, disciplina: t.aulas.disciplinas.nome }}
              />
            </li>
          ))}
        </ul>
      )
  }
  return (
    <section aria-labelledby="titulo-tarefas-pendentes" className="flex flex-col gap-3">
      <h2 id="titulo-tarefas-pendentes" className="text-xl font-semibold">
        Tarefas pendentes
      </h2>
      {conteudo}
      <Link to="/tarefas" className={classeLink}>
        Ver todas as tarefas
      </Link>
    </section>
  )
}

/** Início docente: tarefas das próprias aulas com entregas aguardando avaliação (SPEC §11). */
function EntregasAguardando({ uid, somenteSeHouver }: { uid: string | undefined; somenteSeHouver: boolean }) {
  const tarefas = useEntregasAguardando(uid)
  if (tarefas.isPending) return somenteSeHouver ? null : <Carregando texto="Carregando entregas…" />
  if (tarefas.isError) {
    return somenteSeHouver ? null : (
      <ErroComRetry mensagem="Não foi possível carregar as entregas." onTentarDeNovo={() => void tarefas.refetch()} />
    )
  }
  if (somenteSeHouver && tarefas.data.length === 0) return null
  return (
    <section aria-labelledby="titulo-aguardando" className="flex flex-col gap-3">
      <h2 id="titulo-aguardando" className="text-xl font-semibold">
        Entregas aguardando avaliação
      </h2>
      {tarefas.data.length === 0 ? (
        <EmptyState titulo="Nenhuma entrega aguardando avaliação" />
      ) : (
        <ul className="flex flex-col gap-2">
          {tarefas.data.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-x-2">
              <Link to={`/docente/tarefas/${t.id}/entregas`} className={classeLink}>
                {t.titulo}
              </Link>
              <span className="text-sm text-texto-suave">
                {t.aulas.titulo} · {t.entregas.length} aguardando
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Início da estudante: aulas de hoje, tarefas pendentes e próximas aulas (SPEC §11). */
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
      <TarefasPendentes uid={perfil?.id} />
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
 * Próximas aulas da pessoa docente (SPEC §11). Para a coordenação, só aparece quando ela tem
 * aulas próximas.
 */
function ProximasAulasDocente({ somenteSeHouver }: { somenteSeHouver: boolean }) {
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

/** Início docente: entregas aguardando avaliação + próximas aulas. */
export function InicioDocente({ somenteSeHouver = false }: { somenteSeHouver?: boolean }) {
  const { perfil } = useAuth()
  return (
    <>
      <EntregasAguardando uid={perfil?.id} somenteSeHouver={somenteSeHouver} />
      <ProximasAulasDocente somenteSeHouver={somenteSeHouver} />
    </>
  )
}
