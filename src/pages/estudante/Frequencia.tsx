import { useAuth } from '../../auth/contexto'
import { Card } from '../../components/ui/Card'
import { Carregando } from '../../components/ui/Carregando'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { Etiqueta } from '../../components/ui/Etiqueta'
import { formatarQuando } from '../../lib/datas'
import { ROTULO_PRESENCA, TOM_PRESENCA, formatarPercentual } from '../../lib/frequencia'
import { plural } from '../coordenacao/comum'
import { useMinhaFrequencia, type MinhaTurma } from '../consultasFrequencia'

function CartaoTurma({ turma }: { turma: MinhaTurma }) {
  const { resumo, aulas } = turma
  const idTitulo = `turma-${turma.id}`
  return (
    <Card className="flex flex-col gap-3">
      <section aria-labelledby={idTitulo} className="flex flex-col gap-3">
        <h2 id={idTitulo} className="text-xl font-semibold break-words">
          {turma.nome} ({turma.ano})
        </h2>
        {!resumo || resumo.aulas_com_chamada === 0 ? (
          <p className="text-texto-suave">Ainda não há chamada registrada para você nesta turma.</p>
        ) : (
          <>
            <p>
              <span className="block font-semibold">Frequência geral</span>
              <span className="text-4xl font-bold text-marca">{formatarPercentual(resumo.percentual)}</span>
            </p>
            <p>
              {plural(resumo.presentes, 'presença', 'presenças')} em {plural(resumo.aulas_com_chamada, 'aula', 'aulas')} com
              chamada · {plural(resumo.ausentes, 'ausência', 'ausências')} ·{' '}
              {plural(resumo.justificadas, 'justificada', 'justificadas')}
            </p>
            <p className="text-sm text-texto-suave">Faltas justificadas aparecem à parte e não contam como presença.</p>
          </>
        )}
        {aulas.length > 0 && (
          <>
            <h3 className="text-lg font-semibold">Aulas com chamada</h3>
            <ul className="flex flex-col divide-y divide-borda" aria-label={`Aulas com chamada em ${turma.nome}`}>
              {aulas.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold break-words">{a.titulo}</p>
                    <p className="text-sm text-texto-suave">
                      {a.disciplina} · {formatarQuando(a.data, a.inicio)}
                    </p>
                  </div>
                  <Etiqueta tom={TOM_PRESENCA[a.status]}>{ROTULO_PRESENCA[a.status]}</Etiqueta>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </Card>
  )
}

/** /frequencia — % geral e situação em cada aula com chamada (RF-22). */
export function Frequencia() {
  const { perfil } = useAuth()
  const frequencia = useMinhaFrequencia(perfil?.id)

  let conteudo
  if (frequencia.isPending) {
    conteudo = <Carregando texto="Carregando sua frequência…" />
  } else if (frequencia.isError) {
    conteudo = <ErroComRetry mensagem="Não foi possível carregar sua frequência." onTentarDeNovo={() => void frequencia.refetch()} />
  } else if (frequencia.data.length === 0) {
    conteudo = (
      <EmptyState titulo="Você ainda não está em nenhuma turma">
        <p>A frequência aparece aqui depois que a coordenação fizer a sua matrícula.</p>
      </EmptyState>
    )
  } else {
    conteudo = frequencia.data.map((t) => <CartaoTurma key={t.id} turma={t} />)
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Minha frequência</h1>
      {conteudo}
    </>
  )
}
