import { useQuery, type QueryClient } from '@tanstack/react-query'
import type { Tom } from '../components/ui/Etiqueta'
import { estaAtrasada } from '../lib/datas'
import { supabase } from '../lib/supabase'
import type { Enums, Tables } from '../types/database'
import type { ArquivoDoMaterial } from './consultasAulas'

// Consultas de tarefas e entregas (SPEC §4.4, §11). A RLS (§9.3) decide o que cada pessoa vê:
// - a estudante recebe só tarefas publicadas das suas turmas e só a própria entrega;
// - a docente da aula recebe as tarefas (inclusive rascunhos) e todas as entregas delas;
// - a coordenação vê tudo.
// A escrita de entregas é só por RPC (`enviar_entrega`, `avaliar_entrega`, §9.4).

export type TipoAvaliacao = Enums<'tipo_avaliacao'>

export const ROTULO_AVALIACAO: Record<TipoAvaliacao, string> = {
  nota: 'Nota de 0 a 10',
  conceito: 'Conceito',
  devolutiva: 'Só devolutiva (texto)',
}

export const chavesTarefas = {
  daAula: (aulaId: string) => ['tarefas', 'aula', aulaId] as const,
  detalhe: (id: string) => ['tarefas', 'detalhe', id] as const,
  minhas: (uid: string) => ['tarefas', 'minhas', uid] as const,
  minhaEntrega: (tarefaId: string, uid: string) => ['entregas', 'minha', tarefaId, uid] as const,
  daTarefa: (tarefaId: string) => ['entregas', 'tarefa', tarefaId] as const,
  aguardando: (uid: string) => ['entregas', 'aguardando', uid] as const,
  estudantes: (turmaId: string) => ['estudantes-da-turma', turmaId] as const,
}

/** Tarefas e entregas mudam juntas (contadores, situação, Início): invalida os dois prefixos. */
export async function invalidarTarefas(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['tarefas'] }),
    qc.invalidateQueries({ queryKey: ['entregas'] }),
  ])
}

const CAMPOS_TAREFA = 'id, aula_id, titulo, instrucoes, prazo, tipo_avaliacao, opcoes_conceito, publicada'

export type Tarefa = Pick<
  Tables<'tarefas'>,
  'id' | 'aula_id' | 'titulo' | 'instrucoes' | 'prazo' | 'tipo_avaliacao' | 'opcoes_conceito' | 'publicada'
>

/** Resumo de uma entrega, só para calcular situação e contadores. */
export type EntregaResumo = Pick<Tables<'entregas'>, 'id' | 'enviada_em' | 'avaliada_em'>

export type Entrega = Pick<
  Tables<'entregas'>,
  | 'id'
  | 'tarefa_id'
  | 'estudante_id'
  | 'arquivo_id'
  | 'link'
  | 'comentario'
  | 'enviada_em'
  | 'nota'
  | 'conceito'
  | 'devolutiva'
  | 'avaliada_em'
> & { arquivos: ArquivoDoMaterial | null }

const CAMPOS_ENTREGA =
  'id, tarefa_id, estudante_id, arquivo_id, link, comentario, enviada_em, nota, conceito, devolutiva, avaliada_em, arquivos(id, nome, mime_type, tamanho_bytes, url_visualizacao)'

// ---------------------------------------------------------------------------
// Situação da entrega (SPEC §8.3)
// ---------------------------------------------------------------------------
export type Situacao = 'pendente' | 'enviada' | 'atrasada' | 'avaliada'

/** pendente = sem linha · enviada/atrasada = com linha, não avaliada · avaliada = `avaliada_em` preenchido. */
export function situacaoDaEntrega(entrega: Pick<EntregaResumo, 'enviada_em' | 'avaliada_em'> | null | undefined, prazo: string | null): Situacao {
  if (!entrega) return 'pendente'
  if (entrega.avaliada_em) return 'avaliada'
  return estaAtrasada(entrega.enviada_em, prazo) ? 'atrasada' : 'enviada'
}

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  pendente: 'Pendente',
  enviada: 'Enviada',
  atrasada: 'Enviada com atraso',
  avaliada: 'Avaliada',
}

export const TOM_SITUACAO: Record<Situacao, Tom> = {
  pendente: 'neutro',
  enviada: 'marca',
  atrasada: 'alerta',
  avaliada: 'sucesso',
}

// ---------------------------------------------------------------------------
// Tarefas
// ---------------------------------------------------------------------------
export type TarefaComEntregas = Tarefa & { entregas: EntregaResumo[] }

/** Tarefas da aula (aba Tarefas da docente; seção Tarefas da estudante em /aulas/:id). */
export function useTarefasDaAula(aulaId: string | undefined) {
  return useQuery({
    queryKey: chavesTarefas.daAula(aulaId ?? ''),
    enabled: Boolean(aulaId),
    queryFn: async (): Promise<TarefaComEntregas[]> => {
      const { data, error } = await supabase
        .from('tarefas')
        .select(`${CAMPOS_TAREFA}, entregas(id, enviada_em, avaliada_em)`)
        .eq('aula_id', aulaId as string)
        .order('criado_em')
      if (error) throw error
      return data
    },
  })
}

export type AulaDaTarefa = Pick<Tables<'aulas'>, 'id' | 'titulo' | 'data' | 'inicio' | 'turma_id' | 'professor_id'> & {
  disciplinas: { nome: string }
  turmas: { nome: string; ano: number }
}

export type TarefaDetalhe = Tarefa & { aulas: AulaDaTarefa }

/** Uma tarefa com a aula; `null` se não existir ou se a RLS não deixar ver. */
export function useTarefa(id: string | undefined) {
  return useQuery({
    queryKey: chavesTarefas.detalhe(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<TarefaDetalhe | null> => {
      const { data, error } = await supabase
        .from('tarefas')
        .select(`${CAMPOS_TAREFA}, aulas(id, titulo, data, inicio, turma_id, professor_id, disciplinas(nome), turmas(nome, ano))`)
        .eq('id', id as string)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export type MinhaTarefa = Tarefa & {
  aulas: Pick<Tables<'aulas'>, 'id' | 'titulo' | 'data'> & { disciplinas: { nome: string } }
  entregas: EntregaResumo[]
}

/** /tarefas: tarefas publicadas das turmas da estudante, com a própria entrega (se houver). */
export function useMinhasTarefas(uid: string | undefined) {
  return useQuery({
    queryKey: chavesTarefas.minhas(uid ?? ''),
    enabled: Boolean(uid),
    queryFn: async (): Promise<MinhaTarefa[]> => {
      const { data, error } = await supabase
        .from('tarefas')
        .select(`${CAMPOS_TAREFA}, aulas(id, titulo, data, disciplinas(nome)), entregas(id, enviada_em, avaliada_em)`)
        .eq('publicada', true)
        .eq('entregas.estudante_id', uid as string)
        .order('criado_em')
      if (error) throw error
      return data
    },
  })
}

/** Ordena pelo prazo (mais próximo primeiro); tarefas sem prazo vão para o fim. */
export function porPrazo<T extends Pick<Tarefa, 'prazo'>>(a: T, b: T): number {
  if (a.prazo === b.prazo) return 0
  if (a.prazo === null) return 1
  if (b.prazo === null) return -1
  return a.prazo < b.prazo ? -1 : 1
}

// ---------------------------------------------------------------------------
// Entregas
// ---------------------------------------------------------------------------
/** A entrega da própria estudante na tarefa; `null` se ainda não enviou. */
export function useMinhaEntrega(tarefaId: string | undefined, uid: string | undefined) {
  return useQuery({
    queryKey: chavesTarefas.minhaEntrega(tarefaId ?? '', uid ?? ''),
    enabled: Boolean(tarefaId && uid),
    queryFn: async (): Promise<Entrega | null> => {
      const { data, error } = await supabase
        .from('entregas')
        .select(CAMPOS_ENTREGA)
        .eq('tarefa_id', tarefaId as string)
        .eq('estudante_id', uid as string)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Todas as entregas da tarefa (docente da aula ou coordenação). */
export function useEntregasDaTarefa(tarefaId: string | undefined) {
  return useQuery({
    queryKey: chavesTarefas.daTarefa(tarefaId ?? ''),
    enabled: Boolean(tarefaId),
    queryFn: async (): Promise<Entrega[]> => {
      const { data, error } = await supabase.from('entregas').select(CAMPOS_ENTREGA).eq('tarefa_id', tarefaId as string)
      if (error) throw error
      return data
    },
  })
}

export type EstudanteDaTurma = { id: string; nome_social: string; pronomes: string | null }

/**
 * Nome social e pronomes das estudantes ativas da turma (RPC `estudantes_da_turma`, §9.4). A
 * docente não lê `perfis` de estudantes; a RPC libera só esses campos para quem leciona na turma.
 */
export function useEstudantesDaTurma(turmaId: string | undefined) {
  return useQuery({
    queryKey: chavesTarefas.estudantes(turmaId ?? ''),
    enabled: Boolean(turmaId),
    queryFn: async (): Promise<EstudanteDaTurma[]> => {
      const { data, error } = await supabase.rpc('estudantes_da_turma', { p_turma_id: turmaId as string })
      if (error) throw error
      return data
    },
  })
}

export type TarefaAguardando = Pick<Tarefa, 'id' | 'titulo'> & {
  aulas: Pick<Tables<'aulas'>, 'titulo' | 'professor_id'>
  entregas: { id: string }[]
}

/** Início docente: tarefas das próprias aulas com entregas ainda não avaliadas (RF-18). */
export function useEntregasAguardando(uid: string | undefined) {
  return useQuery({
    queryKey: chavesTarefas.aguardando(uid ?? ''),
    enabled: Boolean(uid),
    queryFn: async (): Promise<TarefaAguardando[]> => {
      const { data, error } = await supabase
        .from('tarefas')
        .select('id, titulo, aulas!inner(titulo, professor_id), entregas!inner(id)')
        .eq('aulas.professor_id', uid as string)
        .is('entregas.avaliada_em', null)
        .order('criado_em')
      if (error) throw error
      return data
    },
  })
}
