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
  // `setUTCFullYear`, e não `Date.UTC`: este trata os anos de 0 a 99 como 1900 + ano, e um campo
  // `type="date"` passa por "0002-11-14" enquanto a pessoa digita o ano.
  const d = new Date(0)
  d.setUTCFullYear(ano, mes - 1, dia)
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

/** "sexta-feira, 13 de novembro" → "Sexta-feira, 13 de novembro". */
export function primeiraMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** "Sexta-feira, 13 de novembro, às 14:00" (ou sem o horário, quando não há). */
export function formatarQuando(data: string, inicio: string | null): string {
  const dia = primeiraMaiuscula(formatarDataLonga(data))
  const hora = formatarHora(inicio)
  return hora ? `${dia}, às ${hora}` : dia
}

// ---------------------------------------------------------------------------
// Prazos (timestamptz) — F5. O campo do formulário é um `datetime-local` em hora de São Paulo.
// ---------------------------------------------------------------------------
const fmtOffset = new Intl.DateTimeFormat('en-US', { timeZone: FUSO, timeZoneName: 'longOffset' })

/** Offset de São Paulo no instante dado, como "-03:00". */
function offsetSP(instante: Date): string {
  const nome = fmtOffset.formatToParts(instante).find((p) => p.type === 'timeZoneName')?.value ?? ''
  return /GMT([+-]\d{2}:\d{2})/.exec(nome)?.[1] ?? '+00:00'
}

/** "2026-11-20T23:59" (hora de São Paulo) → ISO em UTC. null se o texto não for uma data/hora válida. */
export function prazoParaISO(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) || !ehDataISO(local.slice(0, 10))) return null
  const [hora, minuto] = local.slice(11).split(':').map(Number)
  if (hora > 23 || minuto > 59) return null
  // O offset depende do instante (horário de verão, se um dia voltar): aproxima e corrige.
  const aproximado = new Date(`${local}:00-03:00`)
  return new Date(`${local}:00${offsetSP(aproximado)}`).toISOString()
}

const partesDataHora = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** ISO → "2026-11-20T23:59" em hora de São Paulo (valor do `datetime-local`). */
export function isoParaCampoPrazo(iso: string): string {
  const p = Object.fromEntries(partesDataHora.formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

/** ISO → "Sexta-feira, 20 de novembro, às 23:59" (hora de São Paulo). */
export function formatarDataHora(iso: string): string {
  const local = isoParaCampoPrazo(iso)
  return formatarQuando(local.slice(0, 10), local.slice(11))
}

/** Entrega "atrasada" (SPEC §8.3): enviada depois do prazo. Sem prazo, nunca atrasa. */
export function estaAtrasada(enviadaEm: string, prazo: string | null): boolean {
  return prazo !== null && new Date(enviadaEm).getTime() > new Date(prazo).getTime()
}

/** O prazo já passou? Sem prazo, nunca passa. */
export function prazoEncerrado(prazo: string | null, agora: Date = new Date()): boolean {
  return prazo !== null && agora.getTime() > new Date(prazo).getTime()
}
