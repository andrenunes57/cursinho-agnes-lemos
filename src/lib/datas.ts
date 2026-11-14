// Datas no fuso de São Paulo, sem biblioteca (SPEC §6.3). As datas de aula são `date` no banco
// ("YYYY-MM-DD"), sem fuso; a conta é feita em UTC ao meio-dia para nunca virar o dia.

export const FUSO = 'America/Sao_Paulo'

const partesHoje = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Data de hoje em São Paulo, como "YYYY-MM-DD". */
export function hojeSP(agora: Date = new Date()): string {
  const partes = Object.fromEntries(partesHoje.formatToParts(agora).map((p) => [p.type, p.value]))
  return `${partes.year}-${partes.month}-${partes.day}`
}

/** Ano corrente em São Paulo. */
export function anoSP(agora: Date = new Date()): number {
  return Number(hojeSP(agora).slice(0, 4))
}

/** true se o texto é uma data "YYYY-MM-DD" que existe no calendário. */
export function ehDataISO(texto: string | null | undefined): texto is string {
  if (!texto || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false
  const [ano, mes, dia] = texto.split('-').map(Number)
  const d = new Date(Date.UTC(ano, mes - 1, dia))
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia
}

function paraData(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia, 12))
}

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10)
}

/** Soma (ou subtrai) dias a uma data "YYYY-MM-DD". */
export function somarDias(iso: string, dias: number): string {
  const data = paraData(iso)
  data.setUTCDate(data.getUTCDate() + dias)
  return paraISO(data)
}

/** Segunda-feira da semana da data (semana de segunda a domingo). */
export function inicioDaSemana(iso: string): string {
  const diaDaSemana = paraData(iso).getUTCDay() // 0 = domingo
  return somarDias(iso, -((diaDaSemana + 6) % 7))
}

/** Segunda e domingo da semana da data. */
export function intervaloDaSemana(iso: string): { de: string; ate: string } {
  const de = inicioDaSemana(iso)
  return { de, ate: somarDias(de, 6) }
}

const fmtDiaMes = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })
const fmtLonga = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** "16/11" */
export function formatarDiaMes(iso: string): string {
  return fmtDiaMes.format(paraData(iso))
}

/** "segunda-feira, 16 de novembro" */
export function formatarDataLonga(iso: string): string {
  return fmtLonga.format(paraData(iso))
}

/** "14:00:00" (coluna `time`) → "14:00". */
export function formatarHora(hora: string | null): string | null {
  return hora ? hora.slice(0, 5) : null
}
