import { useState, type FormEvent } from 'react'
import { nomeComPronomes } from '../auth/contexto'
import { ROTULO_PRESENCA, STATUS_PRESENCA, TOM_PRESENCA, resumoChamada, type StatusPresenca } from '../lib/frequencia'
import type { EstudanteDaTurma } from '../pages/consultasTarefas'
import { Button } from './ui/Button'
import { Etiqueta } from './ui/Etiqueta'
import { RadioGroup } from './ui/RadioGroup'

export type ItemChamada = { estudante_id: string; status: StatusPresenca }

type Props = {
  estudantes: readonly EstudanteDaTurma[]
  /** Situação já registrada de cada estudante; quem não tem registro começa como "presente". */
  inicial: ReadonlyMap<string, StatusPresenca>
  /** Só a pessoa docente da aula faz a chamada; sem isso, a lista é só leitura (ADR-06). */
  podeEditar: boolean
  enviando?: boolean
  onSalvar?: (itens: ItemChamada[]) => void
}

const OPCOES = STATUS_PRESENCA.map((s) => ({ valor: s, rotulo: ROTULO_PRESENCA[s] }))

function Resumo({ status }: { status: Iterable<StatusPresenca> }) {
  const r = resumoChamada(status)
  return (
    <p className="font-medium">
      Presentes: {r.presente} · Ausentes: {r.ausente} · Justificadas: {r.justificada}
    </p>
  )
}

/** Lista da chamada (RF-20/RF-21): todos "presente" de início; alterna para ausente ou justificada. */
export function ChamadaLista({ estudantes, inicial, podeEditar, enviando = false, onSalvar }: Props) {
  const [marcacao, setMarcacao] = useState<ReadonlyMap<string, StatusPresenca>>(
    () => new Map(estudantes.map((e) => [e.id, inicial.get(e.id) ?? 'presente'])),
  )
  const statusDe = (id: string): StatusPresenca => marcacao.get(id) ?? inicial.get(id) ?? 'presente'

  if (!podeEditar) {
    return (
      <div className="flex flex-col gap-3">
        <Resumo status={estudantes.flatMap((e) => inicial.get(e.id) ?? [])} />
        <ul className="flex flex-col gap-2" aria-label="Chamada da aula">
          {estudantes.map((e) => {
            const status = inicial.get(e.id)
            return (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-borda bg-superficie p-4">
                <span className="min-w-0 font-semibold break-words">{nomeComPronomes(e)}</span>
                {status ? <Etiqueta tom={TOM_PRESENCA[status]}>{ROTULO_PRESENCA[status]}</Etiqueta> : <Etiqueta>Sem registro</Etiqueta>}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  function salvar(evento: FormEvent) {
    evento.preventDefault()
    onSalvar?.(estudantes.map((e) => ({ estudante_id: e.id, status: statusDe(e.id) })))
  }

  return (
    <form onSubmit={salvar} noValidate className="flex flex-col gap-4">
      <Resumo status={estudantes.map((e) => statusDe(e.id))} />
      <ul className="flex flex-col gap-2" aria-label="Estudantes da turma">
        {estudantes.map((e) => (
          <li key={e.id} className="rounded-xl border border-borda bg-superficie p-4">
            <RadioGroup
              legenda={nomeComPronomes(e)}
              nome={`chamada-${e.id}`}
              opcoes={OPCOES}
              valor={statusDe(e.id)}
              onChange={(status) => setMarcacao((atual) => new Map(atual).set(e.id, status))}
              emLinha
            />
          </li>
        ))}
      </ul>
      <Button type="submit" className="self-start" carregando={enviando} textoCarregando="Salvando…">
        Salvar chamada
      </Button>
    </form>
  )
}
