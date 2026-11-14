import type { Tom } from '../components/ui/Etiqueta'
import type { Database, Enums } from '../types/database'
import type { Celula } from './csv'

// Presença e frequência (SPEC §4.5). A regra do % fica numa única função SQL (`frequencia`, §9.4);
// aqui só se formata o que o banco devolve.

export type StatusPresenca = Enums<'status_presenca'>

export const STATUS_PRESENCA: readonly StatusPresenca[] = ['presente', 'ausente', 'justificada']

export const ROTULO_PRESENCA: Record<StatusPresenca, string> = {
  presente: 'Presente',
  ausente: 'Ausente',
  justificada: 'Justificada',
}

export const TOM_PRESENCA: Record<StatusPresenca, Tom> = {
  presente: 'sucesso',
  ausente: 'alerta',
  justificada: 'marca',
}

type Linha = Database['public']['Functions']['frequencia']['Returns'][number]

/** Linha da RPC `frequencia`. O % é nulo quando a pessoa não tem chamada no período. */
export type LinhaFrequencia = Omit<Linha, 'percentual'> & { percentual: number | null }

const fmtPercentual = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** 33.3 → "33,3" (sem o símbolo; o CSV usa assim). */
export function percentualComVirgula(percentual: number): string {
  return fmtPercentual.format(percentual)
}

/** 33.3 → "33,3%"; nulo → "Sem chamada". */
export function formatarPercentual(percentual: number | null): string {
  return percentual === null ? 'Sem chamada' : `${percentualComVirgula(percentual)}%`
}

/** Quantos estudantes em cada situação. */
export function resumoChamada(status: Iterable<StatusPresenca>): Record<StatusPresenca, number> {
  const resumo: Record<StatusPresenca, number> = { presente: 0, ausente: 0, justificada: 0 }
  for (const s of status) resumo[s] += 1
  return resumo
}

export const CABECALHO_CSV_FREQUENCIA = [
  'Estudante',
  'Pronomes',
  'Aulas com chamada',
  'Presentes',
  'Ausentes',
  'Justificadas',
  'Frequência (%)',
] as const

/** Linhas do CSV do relatório (RF-24). O % nulo vira célula vazia. */
export function linhasCsvFrequencia(linhas: readonly LinhaFrequencia[], pronomes: ReadonlyMap<string, string | null>): Celula[][] {
  return linhas.map((l) => [
    l.nome_social,
    pronomes.get(l.estudante_id) ?? '',
    l.aulas_com_chamada,
    l.presentes,
    l.ausentes,
    l.justificadas,
    l.percentual === null ? '' : percentualComVirgula(l.percentual),
  ])
}
