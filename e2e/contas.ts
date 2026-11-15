import type { Database } from '../src/types/database.ts'

type Papel = Database['public']['Enums']['papel_usuario']
type Status = Database['public']['Enums']['status_usuario']

export type Conta = {
  email: string
  /** null = conta sem onboarding (nome social e consentimento vazios). */
  nome_social: string | null
  pronomes: string | null
  papel: Papel
  status: Status
  /** Excluída e criada de novo a cada execução (o teste muda o estado dela). */
  recriar?: boolean
}

// Contas do stack LOCAL (SPEC §14.3). Nunca existem na nuvem.
export const CONTAS = {
  coord: { email: 'coord@teste.local', nome_social: 'Coordenação Teste', pronomes: 'elu/delu', papel: 'coordenacao', status: 'ativo' },
  prof: { email: 'prof@teste.local', nome_social: 'Docente Teste', pronomes: 'ela/dela', papel: 'professor', status: 'ativo' },
  prof2: { email: 'prof2@teste.local', nome_social: 'Docente Dois', pronomes: 'ele/dele', papel: 'professor', status: 'ativo' },
  est: { email: 'est@teste.local', nome_social: 'Estudante Teste', pronomes: 'ela/dela', papel: 'estudante', status: 'ativo' },
  pend: { email: 'pend@teste.local', nome_social: 'Pessoa Pendente', pronomes: null, papel: 'estudante', status: 'pendente' },
  inativo: { email: 'inativo@teste.local', nome_social: 'Pessoa Inativa', pronomes: null, papel: 'estudante', status: 'inativo' },
  // Uma conta nova por projeto (zoom/desktop), sem onboarding, para o acesso.spec.ts.
  'novo-zoom': { email: 'novo-zoom@teste.local', nome_social: null, pronomes: null, papel: 'estudante', status: 'pendente', recriar: true },
  'novo-desktop': { email: 'novo-desktop@teste.local', nome_social: null, pronomes: null, papel: 'estudante', status: 'pendente', recriar: true },
  // Pendentes com onboarding feito, aprovadas pela coordenação no coordenacao.spec.ts (uma por projeto).
  'aprovar-est-zoom': { email: 'aprovar-est-zoom@teste.local', nome_social: 'Estudante Aprovação Zoom', pronomes: null, papel: 'estudante', status: 'pendente', recriar: true },
  'aprovar-est-desktop': { email: 'aprovar-est-desktop@teste.local', nome_social: 'Estudante Aprovação Desktop', pronomes: null, papel: 'estudante', status: 'pendente', recriar: true },
  'aprovar-prof-zoom': { email: 'aprovar-prof-zoom@teste.local', nome_social: 'Docente Aprovação Zoom', pronomes: null, papel: 'estudante', status: 'pendente', recriar: true },
  'aprovar-prof-desktop': { email: 'aprovar-prof-desktop@teste.local', nome_social: 'Docente Aprovação Desktop', pronomes: null, papel: 'estudante', status: 'pendente', recriar: true },
} as const satisfies Record<string, Conta>

export type NomeConta = keyof typeof CONTAS

/** Arquivo de storageState (sessão já logada) de cada conta. */
export const estadoDe = (conta: NomeConta) => `e2e/.auth/${conta}.json`

/** Turma criada pelo global-setup para o materiais.spec.ts (com a `est` matriculada). */
export const TURMA_MATERIAIS = 'E2E Turma Materiais'

/** Turmas do chamada.spec.ts, uma por projeto (com a `est` matriculada), para o relatório não
 * misturar as chamadas dos projetos zoom e desktop, que rodam em paralelo. */
export const PROJETOS = ['zoom', 'desktop'] as const
export const turmaChamada = (projeto: string) => `E2E Turma Chamada ${projeto}`

/** Turma do a11y.spec.ts: o global-setup cria nela uma aula passada da `prof`, com material,
 * tarefa, entrega e chamada da `est`, para as rotas com `:id` terem conteúdo. */
export const TURMA_A11Y = 'E2E Turma A11y'
export const TITULO_AULA_A11Y = 'E2E Aula A11y'
export const TITULO_TAREFA_A11Y = 'E2E Tarefa A11y'

/** Ids gravados pelo global-setup e lidos pelo a11y.spec.ts. */
export const FIXTURES_A11Y = 'e2e/.auth/a11y.json'
export type FixturesA11y = { aulaId: string; tarefaId: string }
