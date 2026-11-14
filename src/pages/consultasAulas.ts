import { useQuery } from '@tanstack/react-query'
import { nomeComPronomes } from '../auth/contexto'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import { useEquipe } from './coordenacao/consultas'

// Consultas de aulas e materiais compartilhadas por docente, estudante e Início (SPEC §11).
// A RLS (§9.3) decide o que cada pessoa vê: a estudante só recebe aulas das suas turmas e
// materiais publicados; a docente, as próprias aulas com rascunhos.

export const chavesAulas = {
  /** Prefixo ['aulas'] é invalidado por `invalidarAulas` (coordenação). */
  lista: (escopo: 'minhas' | 'turmas', uid: string) => ['aulas', 'lista', escopo, uid] as const,
  detalhe: (id: string) => ['aulas', 'detalhe', id] as const,
  materiais: (aulaId: string) => ['materiais', aulaId] as const,
}

const CAMPOS_AULA = 'id, data, inicio, titulo, turma_id, disciplina_id, professor_id, turmas(nome, ano), disciplinas(nome)'

export type Aula = Pick<
  Tables<'aulas'>,
  'id' | 'data' | 'inicio' | 'titulo' | 'turma_id' | 'disciplina_id' | 'professor_id'
> & {
  turma: string
  disciplina: string
}

type LinhaAula = Omit<Aula, 'turma' | 'disciplina'> & {
  turmas: { nome: string; ano: number }
  disciplinas: { nome: string }
}

function paraAula({ turmas, disciplinas, ...aula }: LinhaAula): Aula {
  return { ...aula, turma: turmas.nome, disciplina: disciplinas.nome }
}

/**
 * `minhas`: aulas em que a pessoa é docente (RF-10). `turmas`: agenda da estudante (RF-13), que a
 * RLS já restringe às turmas em que ela está matriculada.
 */
export function useAulas(escopo: 'minhas' | 'turmas', uid: string | undefined) {
  return useQuery({
    queryKey: chavesAulas.lista(escopo, uid ?? ''),
    enabled: Boolean(uid),
    queryFn: async (): Promise<Aula[]> => {
      let consulta = supabase.from('aulas').select(CAMPOS_AULA)
      if (escopo === 'minhas') consulta = consulta.eq('professor_id', uid as string)
      const { data, error } = await consulta.order('data').order('inicio', { nullsFirst: true })
      if (error) throw error
      return data.map(paraAula)
    },
  })
}

/** Uma aula; `null` se não existir ou se a RLS não deixar ver. */
export function useAula(id: string | undefined) {
  return useQuery({
    queryKey: chavesAulas.detalhe(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<Aula | null> => {
      const { data, error } = await supabase
        .from('aulas')
        .select(CAMPOS_AULA)
        .eq('id', id as string)
        .maybeSingle()
      if (error) throw error
      return data ? paraAula(data) : null
    },
  })
}

/** Separa as aulas em próximas (hoje em diante, mais cedo primeiro) e anteriores (mais recente primeiro). */
export function separarPorData(aulas: Aula[], hoje: string): { proximas: Aula[]; anteriores: Aula[] } {
  return {
    proximas: aulas.filter((a) => a.data >= hoje),
    anteriores: aulas.filter((a) => a.data < hoje).reverse(),
  }
}

/**
 * Nome + pronomes de quem dá a aula. A estudante não lê `perfis` de outras pessoas (RLS), então o
 * nome vem da RPC `equipe()` (§9.4), que só lista pessoas ativas.
 */
export function useNomeDocente() {
  const equipe = useEquipe()
  const nomes = new Map((equipe.data ?? []).map((m) => [m.id, nomeComPronomes(m)]))
  return (professorId: string) => nomes.get(professorId) ?? 'Docente'
}

// ---------------------------------------------------------------------------
// Materiais
// ---------------------------------------------------------------------------
export type ArquivoDoMaterial = Pick<Tables<'arquivos'>, 'id' | 'nome' | 'mime_type' | 'tamanho_bytes' | 'url_visualizacao'>

export type Material = Pick<
  Tables<'materiais'>,
  'id' | 'aula_id' | 'tipo' | 'titulo' | 'conteudo' | 'url' | 'arquivo_id' | 'publicado' | 'ordem'
> & { arquivos: ArquivoDoMaterial | null }

export function useMateriais(aulaId: string | undefined) {
  return useQuery({
    queryKey: chavesAulas.materiais(aulaId ?? ''),
    enabled: Boolean(aulaId),
    queryFn: async (): Promise<Material[]> => {
      const { data, error } = await supabase
        .from('materiais')
        .select(
          'id, aula_id, tipo, titulo, conteudo, url, arquivo_id, publicado, ordem, arquivos(id, nome, mime_type, tamanho_bytes, url_visualizacao)',
        )
        .eq('aula_id', aulaId as string)
        .order('ordem')
        .order('criado_em')
      if (error) throw error
      return data
    },
  })
}
