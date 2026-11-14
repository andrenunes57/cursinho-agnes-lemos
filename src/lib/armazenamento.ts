import type { Finalidade } from './arquivos'

// Tela Armazenamento (RF-25): uso do Drive, totais por finalidade e arquivos órfãos.

/** Arquivo com as referências que o mantêm em uso (embed reverso de `materiais` e `entregas`). */
export type ArquivoArmazenado = {
  id: string
  nome: string
  tamanho_bytes: number
  url_visualizacao: string
  finalidade: Finalidade
  conta_armazenamento: string
  criado_em: string
  materiais: { id: string }[]
  entregas: { id: string }[]
}

/** Um upload recente pode ainda estar sendo ligado ao material/entrega: só vira órfão após 24h. */
export const IDADE_MINIMA_ORFAO_MS = 24 * 60 * 60 * 1000

/** Percentual de uso a partir do qual a tela alerta (§16.3). */
export const ALERTA_USO = 80

/** Órfão = nenhum material nem entrega o referencia, e foi criado há mais de 24h. Mais antigos primeiro. */
export function separarOrfaos<T extends ArquivoArmazenado>(arquivos: readonly T[], agora: Date = new Date()): T[] {
  const limite = agora.getTime() - IDADE_MINIMA_ORFAO_MS
  return arquivos
    .filter((a) => a.materiais.length === 0 && a.entregas.length === 0 && new Date(a.criado_em).getTime() < limite)
    .sort((a, b) => a.criado_em.localeCompare(b.criado_em))
}

export type Total = { quantidade: number; bytes: number }

export function totaisPorFinalidade(arquivos: readonly Pick<ArquivoArmazenado, 'finalidade' | 'tamanho_bytes'>[]): Record<Finalidade, Total> {
  const totais: Record<Finalidade, Total> = { material: { quantidade: 0, bytes: 0 }, entrega: { quantidade: 0, bytes: 0 } }
  for (const a of arquivos) {
    totais[a.finalidade].quantidade += 1
    totais[a.finalidade].bytes += a.tamanho_bytes
  }
  return totais
}

/** Uso em % (0–100, uma casa); null se o limite não for conhecido. */
export function percentualUso(usadoBytes: number, limiteBytes: number): number | null {
  if (!(limiteBytes > 0)) return null
  return Math.min(100, Math.round((1000 * usadoBytes) / limiteBytes) / 10)
}

export function emAlerta(percentual: number | null): boolean {
  return percentual !== null && percentual >= ALERTA_USO
}
