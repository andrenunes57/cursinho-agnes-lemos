import { useQuery, type QueryClient } from '@tanstack/react-query'
import type { StatusPresenca, LinhaFrequencia } from '../lib/frequencia'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import { chaves } from './coordenacao/consultas'

// Consultas de chamada e frequência (SPEC §4.5, §11). A RLS de `presencas` (§9.3) libera a leitura
// para a própria estudante, a docente da aula e a coordenação. A escrita é só pela RPC
// `registrar_chamada`, e o % vem sempre da RPC `frequencia` (§9.4), que aplica o escopo de cada papel.

export const chavesFrequencia = {
  presencasDaAula: (aulaId: string) => ['presencas', 'aula', aulaId] as const,
  relatorio: (turmaId: string, de: string, ate: string) => ['frequencia', 'relatorio', turmaId, de, ate] as const,
  minha: (uid: string) => ['frequencia', 'minha', uid] as const,
  turmasDoDocente: (uid: string) => ['frequencia', 'turmas-docente', uid] as const,
}

/** Depois de salvar uma chamada: presenças, relatórios, contadores do Início e "sem chamada" do cronograma. */
export async function invalidarChamada(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['presencas'] }),
    qc.invalidateQueries({ queryKey: ['frequencia'] }),
    qc.invalidateQueries({ queryKey: chaves.contadores }),
    qc.invalidateQueries({ queryKey: chaves.aulas }),
  ])
}

export type Presenca = Pick<Tables<'presencas'>, 'estudante_id' | 'status' | 'registrado_em'>

/** Presenças já registradas na aula (vazio = chamada ainda não feita). */
export function usePresencasDaAula(aulaId: string | undefined) {
  return useQuery({
    queryKey: chavesFrequencia.presencasDaAula(aulaId ?? ''),
    enabled: Boolean(aulaId),
    queryFn: async (): Promise<Presenca[]> => {
      const { data, error } = await supabase
        .from('presencas')
        .select('estudante_id, status, registrado_em')
        .eq('aula_id', aulaId as string)
      if (error) throw error
      return data
    },
  })
}

/** Relatório da turma no período (RF-23). Datas vazias = sem limite. */
export function useFrequencia(turmaId: string | undefined, de: string, ate: string, habilitado = true) {
  return useQuery({
    queryKey: chavesFrequencia.relatorio(turmaId ?? '', de, ate),
    enabled: Boolean(turmaId) && habilitado,
    queryFn: async (): Promise<LinhaFrequencia[]> => {
      const { data, error } = await supabase.rpc('frequencia', {
        p_turma_id: turmaId as string,
        p_de: de || undefined,
        p_ate: ate || undefined,
      })
      if (error) throw error
      return data
    },
  })
}

export type AulaComPresenca = Pick<Tables<'aulas'>, 'id' | 'titulo' | 'data' | 'inicio'> & {
  disciplina: string
  status: StatusPresenca
}

export type MinhaTurma = {
  id: string
  nome: string
  ano: number
  /** Linha da própria estudante na RPC `frequencia`. */
  resumo: LinhaFrequencia | null
  /** Aulas da turma com chamada registrada, da mais recente para a mais antiga. */
  aulas: AulaComPresenca[]
}

/** /frequencia: % por turma (RPC) e a situação em cada aula com chamada (RF-22). */
export function useMinhaFrequencia(uid: string | undefined) {
  return useQuery({
    queryKey: chavesFrequencia.minha(uid ?? ''),
    enabled: Boolean(uid),
    queryFn: async (): Promise<MinhaTurma[]> => {
      const [matriculas, presencas] = await Promise.all([
        supabase.from('matriculas').select('turma_id, turmas(nome, ano)').eq('estudante_id', uid as string),
        supabase
          .from('presencas')
          .select('status, aulas(id, titulo, data, inicio, turma_id, disciplinas(nome))')
          .eq('estudante_id', uid as string),
      ])
      if (matriculas.error) throw matriculas.error
      if (presencas.error) throw presencas.error

      const turmas = await Promise.all(
        matriculas.data.map(async (m): Promise<MinhaTurma> => {
          const { data, error } = await supabase.rpc('frequencia', { p_turma_id: m.turma_id })
          if (error) throw error
          const aulas = presencas.data
            .filter((p) => p.aulas?.turma_id === m.turma_id)
            .map(({ status, aulas: a }) => ({
              id: a.id,
              titulo: a.titulo,
              data: a.data,
              inicio: a.inicio,
              disciplina: a.disciplinas.nome,
              status,
            }))
            .sort((a, b) => `${b.data}${b.inicio ?? ''}`.localeCompare(`${a.data}${a.inicio ?? ''}`))
          return { id: m.turma_id, nome: m.turmas.nome, ano: m.turmas.ano, resumo: data[0] ?? null, aulas }
        }),
      )
      return turmas.sort((a, b) => b.ano - a.ano || a.nome.localeCompare(b.nome, 'pt-BR'))
    },
  })
}

export type TurmaDoRelatorio = { id: string; nome: string; ano: number; ativa: boolean }

/** Ativas primeiro, depois as mais recentes, e por nome. */
export function ordenarTurmas<T extends TurmaDoRelatorio>(turmas: T[]): T[] {
  return [...turmas].sort(
    (a, b) => Number(b.ativa) - Number(a.ativa) || b.ano - a.ano || a.nome.localeCompare(b.nome, 'pt-BR'),
  )
}

/** /docente/frequencia: turmas em que a pessoa tem aulas. */
export function useTurmasDoDocente(uid: string | undefined) {
  return useQuery({
    queryKey: chavesFrequencia.turmasDoDocente(uid ?? ''),
    enabled: Boolean(uid),
    queryFn: async (): Promise<TurmaDoRelatorio[]> => {
      const { data, error } = await supabase.from('aulas').select('turma_id, turmas(nome, ano, ativa)').eq('professor_id', uid as string)
      if (error) throw error
      const porId = new Map(data.map((a) => [a.turma_id, { id: a.turma_id, ...a.turmas }]))
      return ordenarTurmas([...porId.values()])
    },
  })
}
