import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { nomeComPronomes } from '../auth/contexto'
import { baixarCSV, gerarCSV, paraNomeDeArquivo } from '../lib/csv'
import { ehDataISO } from '../lib/datas'
import { CABECALHO_CSV_FREQUENCIA, formatarPercentual, linhasCsvFrequencia, type LinhaFrequencia } from '../lib/frequencia'
import { useFrequencia, type TurmaDoRelatorio } from '../pages/consultasFrequencia'
import { useEstudantesDaTurma } from '../pages/consultasTarefas'
import { Button } from './ui/Button'
import { Carregando } from './ui/Carregando'
import { EmptyState } from './ui/EmptyState'
import { ErroComRetry } from './ui/ErroComRetry'
import { Field } from './ui/Field'
import { Select } from './ui/Select'

type Props = {
  /** Turmas que a pessoa pode consultar (não vazio). */
  turmas: readonly TurmaDoRelatorio[]
  /** Botão "Exportar CSV" (RF-24, só coordenação). */
  exportar?: boolean
}

type Filtro = 'turma' | 'de' | 'ate'

/** "2026-11-14" → "14/11/2026". */
const dataBR = (iso: string) => iso.split('-').reverse().join('/')

function descreverPeriodo(de: string, ate: string): string {
  if (de && ate) return `de ${dataBR(de)} a ${dataBR(ate)}`
  if (de) return `a partir de ${dataBR(de)}`
  if (ate) return `até ${dataBR(ate)}`
  return 'todo o período'
}

const COLUNAS = [
  { campo: 'aulas_com_chamada', rotulo: 'Aulas com chamada' },
  { campo: 'presentes', rotulo: 'Presentes' },
  { campo: 'ausentes', rotulo: 'Ausentes' },
  { campo: 'justificadas', rotulo: 'Justificadas' },
] as const

/** Relatório de frequência por turma e período (RF-23), com o escopo aplicado pela RPC. */
export function RelatorioFrequencia({ turmas, exportar = false }: Props) {
  const [params, setParams] = useSearchParams()
  const turma = turmas.find((t) => t.id === params.get('turma')) ?? turmas[0]
  // As datas ficam em estado local e a URL só espelha o filtro. Um campo de data controlado direto
  // pela URL recebe o valor antigo de volta enquanto o `setParams` não termina, e esse valor zera a
  // digitação do ano no Chrome. Como `mudar` usa `replace`, a URL não muda por fora com a página aberta.
  const [textoDe, setTextoDe] = useState(() => params.get('de') ?? '')
  const [textoAte, setTextoAte] = useState(() => params.get('ate') ?? '')
  const de = ehDataISO(textoDe) ? textoDe : ''
  const ate = ehDataISO(textoAte) ? textoAte : ''
  const periodoInvalido = Boolean(de && ate && de > ate)

  const frequencia = useFrequencia(turma.id, de, ate, !periodoInvalido)
  const estudantes = useEstudantesDaTurma(turma.id)

  function mudar(chave: Filtro, valor: string) {
    setParams(
      (atual) => {
        if (valor) atual.set(chave, valor)
        else atual.delete(chave)
        return atual
      },
      { replace: true },
    )
  }

  // Os pronomes vêm de `estudantes_da_turma` (a RPC `frequencia` só devolve o nome social).
  const pronomes = new Map((estudantes.data ?? []).map((e) => [e.id, e.pronomes]))
  const nome = (l: LinhaFrequencia) => nomeComPronomes({ nome_social: l.nome_social, pronomes: pronomes.get(l.estudante_id) ?? null })
  const periodo = descreverPeriodo(de, ate)

  function baixar(linhas: LinhaFrequencia[]) {
    const sufixo = de || ate ? `${de || 'inicio'}-a-${ate || 'hoje'}` : 'todo-o-periodo'
    baixarCSV(
      `frequencia-${paraNomeDeArquivo(turma.nome)}-${sufixo}.csv`,
      gerarCSV(CABECALHO_CSV_FREQUENCIA, linhasCsvFrequencia(linhas, pronomes)),
    )
  }

  let conteudo
  if (periodoInvalido) {
    conteudo = null
  } else if (frequencia.isPending || estudantes.isPending) {
    conteudo = <Carregando texto="Carregando frequência…" />
  } else if (frequencia.isError) {
    conteudo = <ErroComRetry mensagem="Não foi possível carregar a frequência." onTentarDeNovo={() => void frequencia.refetch()} />
  } else if (frequencia.data.length === 0) {
    conteudo = (
      <EmptyState titulo="Nenhuma pessoa estudante nesta turma">
        <p>O relatório lista as pessoas estudantes matriculadas na turma.</p>
      </EmptyState>
    )
  } else {
    const linhas = frequencia.data
    const titulo = `${turma.nome} (${turma.ano}), ${periodo}`
    conteudo = (
      <section aria-labelledby="titulo-relatorio" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titulo-relatorio" className="text-xl font-semibold">
            {titulo}
          </h2>
          {exportar && (
            <Button variante="secundario" onClick={() => baixar(linhas)}>
              Exportar CSV
            </Button>
          )}
        </div>

        {/* Janela larga: tabela. Janela estreita (zoom alto): cartões (SPEC §5.3). */}
        <div className="hidden largo:block">
          <table className="w-full border-collapse rounded-xl bg-superficie text-left">
            <caption className="sr-only">Frequência de {titulo}</caption>
            <thead>
              <tr className="border-b-2 border-borda-forte">
                <th scope="col" className="p-3">
                  Estudante
                </th>
                {COLUNAS.map((c) => (
                  <th key={c.campo} scope="col" className="p-3 text-right">
                    {c.rotulo}
                  </th>
                ))}
                <th scope="col" className="p-3 text-right">
                  Frequência
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.estudante_id} className="border-b border-borda">
                  <th scope="row" className="p-3 font-semibold break-words">
                    {nome(l)}
                  </th>
                  {COLUNAS.map((c) => (
                    <td key={c.campo} className="p-3 text-right tabular-nums">
                      {l[c.campo]}
                    </td>
                  ))}
                  <td className="p-3 text-right font-semibold tabular-nums">{formatarPercentual(l.percentual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="flex flex-col gap-3 largo:hidden" aria-label={`Frequência de ${titulo}`}>
          {linhas.map((l) => (
            <li key={l.estudante_id} className="rounded-xl border border-borda bg-superficie p-4 shadow-sm">
              <h3 className="font-semibold break-words">{nome(l)}</h3>
              <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                {COLUNAS.map((c) => (
                  <div key={c.campo} className="contents">
                    <dt>{c.rotulo}</dt>
                    <dd className="text-right tabular-nums">{l[c.campo]}</dd>
                  </div>
                ))}
                <dt className="font-semibold">Frequência</dt>
                <dd className="text-right font-semibold tabular-nums">{formatarPercentual(l.percentual)}</dd>
              </dl>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4 largo:flex-row largo:items-start">
        <div className="largo:w-72">
          <Select
            rotulo="Turma"
            opcoes={turmas.map((t) => ({ valor: t.id, rotulo: `${t.nome} (${t.ano})${t.ativa ? '' : ' — inativa'}` }))}
            value={turma.id}
            onChange={(e) => mudar('turma', e.target.value)}
          />
        </div>
        <Field
          rotulo="De"
          type="date"
          value={textoDe}
          max={ate || undefined}
          onChange={(e) => {
            setTextoDe(e.target.value)
            mudar('de', e.target.value)
          }}
        />
        <Field
          rotulo="Até"
          type="date"
          value={textoAte}
          min={de || undefined}
          onChange={(e) => {
            setTextoAte(e.target.value)
            mudar('ate', e.target.value)
          }}
          erro={periodoInvalido ? 'A data final precisa ser igual ou posterior à inicial.' : null}
        />
      </div>
      <p className="text-sm text-texto-suave">
        Datas em branco consideram todas as aulas. Frequência = presenças ÷ aulas com chamada. Justificadas aparecem à
        parte e contam como não presença.
      </p>
      {conteudo}
    </>
  )
}
