import { useSearchParams } from 'react-router'
import { useAuth } from '../../auth/contexto'
import { ListaAulas } from '../../components/ListaAulas'
import { Carregando } from '../../components/ui/Carregando'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { Select } from '../../components/ui/Select'
import { hojeSP } from '../../lib/datas'
import { useAulas, useNomeDocente } from '../consultasAulas'

/** /aulas — agenda das turmas da estudante, com filtro por disciplina (RF-13). */
export function Aulas() {
  const { perfil } = useAuth()
  const [params, setParams] = useSearchParams()
  const aulas = useAulas('turmas', perfil?.id)
  const nomeDocente = useNomeDocente()
  const hoje = hojeSP()

  let conteudo
  if (aulas.isPending) {
    conteudo = <Carregando texto="Carregando suas aulas…" />
  } else if (aulas.isError) {
    conteudo = <ErroComRetry mensagem="Não foi possível carregar suas aulas." onTentarDeNovo={() => void aulas.refetch()} />
  } else if (aulas.data.length === 0) {
    conteudo = (
      <EmptyState titulo="Nenhuma aula por enquanto">
        <p>Quando a coordenação ou docentes marcarem aulas para a sua turma, elas aparecem aqui.</p>
      </EmptyState>
    )
  } else {
    // Só as disciplinas que têm aula na agenda.
    const disciplinas = [...new Map(aulas.data.map((a) => [a.disciplina_id, a.disciplina])).entries()]
      .map(([valor, rotulo]) => ({ valor, rotulo }))
      .sort((x, y) => x.rotulo.localeCompare(y.rotulo, 'pt-BR'))
    const filtro = disciplinas.some((d) => d.valor === params.get('disciplina')) ? (params.get('disciplina') as string) : ''
    const filtradas = filtro ? aulas.data.filter((a) => a.disciplina_id === filtro) : aulas.data

    conteudo = (
      <>
        <div className="largo:w-72">
          <Select
            rotulo="Disciplina"
            vazio="Todas as disciplinas"
            opcoes={disciplinas}
            value={filtro}
            onChange={(e) =>
              setParams(
                (atual) => {
                  if (e.target.value) atual.set('disciplina', e.target.value)
                  else atual.delete('disciplina')
                  return atual
                },
                { replace: true },
              )
            }
          />
        </div>
        <ListaAulas
          aulas={filtradas}
          hoje={hoje}
          para={(a) => `/aulas/${a.id}`}
          docente={(a) => nomeDocente(a.professor_id)}
          semProximas={filtro ? 'Nenhuma aula marcada desta disciplina.' : 'Nenhuma aula marcada daqui para a frente.'}
        />
      </>
    )
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Aulas</h1>
      {conteudo}
    </>
  )
}
