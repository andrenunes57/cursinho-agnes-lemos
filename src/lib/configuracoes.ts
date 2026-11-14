import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { MAX_MB_PADRAO, MB, enviarArquivo, excluirArquivo, type ConfigArquivos, type Finalidade } from './arquivos'
import { supabase } from './supabase'

// Configurações editáveis pela coordenação (SPEC §8.3 `configuracoes`, RF-26):
// - api_arquivos: { url, conta }
// - limites: { max_mb }

export type Configuracoes = { url: string; conta: string; maxMb: number }

export const chaveConfiguracoes = ['configuracoes'] as const

type Linha = { chave: string; valor: unknown }

function texto(obj: unknown, campo: string): string {
  const v = obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[campo] : undefined
  return typeof v === 'string' ? v.trim() : ''
}

/** Lê as linhas de `configuracoes` tolerando valores ausentes ou malformados. */
export function lerConfiguracoes(linhas: Linha[]): Configuracoes {
  const api = linhas.find((l) => l.chave === 'api_arquivos')?.valor
  const limites = linhas.find((l) => l.chave === 'limites')?.valor
  const maxMb = Number(limites && typeof limites === 'object' ? (limites as Record<string, unknown>).max_mb : NaN)
  return {
    url: texto(api, 'url'),
    conta: texto(api, 'conta') || 'drive-01',
    maxMb: Number.isFinite(maxMb) && maxMb > 0 ? maxMb : MAX_MB_PADRAO,
  }
}

export function useConfiguracoes() {
  return useQuery({
    queryKey: chaveConfiguracoes,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Configuracoes> => {
      const { data, error } = await supabase.from('configuracoes').select('chave, valor')
      if (error) throw error
      return lerConfiguracoes(data)
    },
  })
}

async function obterToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

/**
 * API de Arquivos pronta para uso (§10.6): URL de `configuracoes.api_arquivos.url`, com fallback
 * para `VITE_API_ARQUIVOS_URL`, e o limite de `configuracoes.limites.max_mb`.
 */
export function useApiArquivos() {
  const consulta = useConfiguracoes()
  const cfg = consulta.data
  const url = cfg?.url || (import.meta.env.VITE_API_ARQUIVOS_URL ?? '').trim()
  const maxBytes = (cfg?.maxMb ?? MAX_MB_PADRAO) * MB

  return useMemo(() => {
    const config: ConfigArquivos = { url, maxBytes, obterToken }
    return {
      carregando: consulta.isPending,
      configurada: Boolean(url),
      maxBytes,
      enviar: (arquivo: File, finalidade: Finalidade) => enviarArquivo(arquivo, finalidade, config),
      excluir: (arquivoId: string) => excluirArquivo(arquivoId, config),
    }
  }, [url, maxBytes, consulta.isPending])
}
