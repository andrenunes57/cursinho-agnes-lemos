import { useQuery, type QueryClient } from '@tanstack/react-query'
import { hojeSP, intervaloDaSemana } from '../../lib/datas'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../types/database'

// Consultas compartilhadas pelas telas da coordenação (SPEC §11). A RLS (§9.3) libera para a
// coordenação a leitura de perfis, matrículas, turmas, disciplinas, aulas e presenças.

export const chaves = {
  pessoas: ['pessoas'] as const,
  turmas: ['turmas'] as const,
  disciplinas: ['disciplinas'] as const,
  equipe: ['equipe'] as const,
  matriculas: ['matriculas'] as const,
  matriculasDaTurma: (turmaId: string) => ['matriculas', 'turma', turmaId] as const,
  aulas: ['aulas'] as const,
  aulasDaSemana: (turmaId: string, de: string) => ['aulas', 'semana', turmaId, de] as const,
  contadores: ['contadores-coordenacao'] as const,
}

/** Depois de mudar pessoas (aprovação, papel, status, matrícula). */
export function invalidarPessoas(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: chaves.pessoas }),
    qc.invalidateQueries({ queryKey: chaves.equipe }),
    qc.invalidateQueries({ queryKey: chaves.matriculas }),
    qc.invalidateQueries({ queryKey: chaves.turmas }),
    qc.invalidateQueries({ queryKey: chaves.contadores }),
  ])
}

/** Depois de criar, editar ou excluir aulas. */
export function invalidarAulas(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: chaves.aulas }),
    qc.invalidateQueries({ queryKey: chaves.contadores }),
    qc.invalidateQueries({ queryKey: ['leciona-alguma-aula'] }),
  ])
}

// ---------------------------------------------------------------------------
// Pessoas
// ---------------------------------------------------------------------------
export type Pessoa = Pick<Tables<'perfis'>, 'id' | 'email' | 'nome_social' | 'pronomes' | 'papel' | 'status'> & {
  matriculas: { turma_id: string }[]
}

/** Todas as pessoas (~100, SPEC §5.2); as abas filtram por status no cliente. */
export function usePessoas() {
  return useQuery({
    queryKey: chaves.pessoas,
    queryFn: async (): Promise<Pessoa[]> => {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, email, nome_social, pronomes, papel, status, matriculas(turma_id)')
        .order('nome_social', { ascending: true, nullsFirst: false })
        .order('email')
      if (error) throw error
      return data
    },
  })
}

// ---------------------------------------------------------------------------
// Turmas e disciplinas
// ---------------------------------------------------------------------------
export type Turma = Pick<Tables<'turmas'>, 'id' | 'nome' | 'ano' | 'ativa'> & { estudantes: number }

export function useTurmas() {
  return useQuery({
    queryKey: chaves.turmas,
    queryFn: async (): Promise<Turma[]> => {
      const { data, error } = await supabase
        .from('turmas')
        .select('id, nome, ano, ativa, matriculas(count)')
        .order('ano', { ascending: false })
        .order('nome')
      if (error) throw error
      return data.map(({ matriculas, ...turma }) => ({ ...turma, estudantes: matriculas[0]?.count ?? 0 }))
    },
  })
}

export type Disciplina = Tables<'disciplinas'>

export function useDisciplinas() {
  return useQuery({
    queryKey: chaves.disciplinas,
    queryFn: async (): Promise<Disciplina[]> => {
      const { data, error } = await supabase.from('disciplinas').select('id, nome, ativa').order('nome')
      if (error) throw error
      return data
    },
  })
}

// ---------------------------------------------------------------------------
// Equipe (docentes e coordenação ativas), via RPC (§9.4)
// ---------------------------------------------------------------------------
export type MembroEquipe = { id: string; nome_social: string; pronomes: string | null; papel: Tables<'perfis'>['papel'] }

export function useEquipe() {
  return useQuery({
    queryKey: chaves.equipe,
    queryFn: async (): Promise<MembroEquipe[]> => {
      const { data, error } = await supabase.rpc('equipe')
      if (error) throw error
      return data
    },
  })
}

// ---------------------------------------------------------------------------
// Aulas sem chamada (Início e cronograma)
// ---------------------------------------------------------------------------
/** Ids, entre os informados, das aulas que já têm alguma presença registrada. */
export async function aulasComChamada(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const { data, error } = await supabase.from('presencas').select('aula_id').in('aula_id', ids)
  if (error) throw error
  return new Set(data.map((p) => p.aula_id))
}

export type Contadores = { pendentes: number; semChamada: number }

/** Contadores do Início da coordenação (SPEC §11). */
export function useContadores() {
  return useQuery({
    queryKey: chaves.contadores,
    queryFn: async (): Promise<Contadores> => {
      const hoje = hojeSP()
      const { de } = intervaloDaSemana(hoje)

      const [pendentes, aulas] = await Promise.all([
        supabase.from('perfis').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('aulas').select('id').gte('data', de).lte('data', hoje),
      ])
      if (pendentes.error) throw pendentes.error
      if (aulas.error) throw aulas.error

      const ids = aulas.data.map((a) => a.id)
      const comChamada = await aulasComChamada(ids)
      return { pendentes: pendentes.count ?? 0, semChamada: ids.filter((id) => !comChamada.has(id)).length }
    },
  })
}
