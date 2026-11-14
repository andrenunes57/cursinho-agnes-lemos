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
  // Uma conta nova por projeto (celular/desktop), sem onboarding, para o acesso.spec.ts.
  'novo-celular': { email: 'novo-celular@teste.local', nome_social: null, pronomes: null, papel: 'estudante', status: 'pendente', recriar: true },
  'novo-desktop': { email: 'novo-desktop@teste.local', nome_social: null, pronomes: null, papel: 'estudante', status: 'pendente', recriar: true },
  // Pendentes com onboarding feito, aprovadas pela coordenação no coordenacao.spec.ts (uma por projeto).
  'aprovar-est-celular': { email: 'aprovar-est-celular@teste.local', nome_social: 'Estudante Aprovação Celular', pronomes: null, papel: 'estudante', status: 'pendente', recriar: true },
  'aprovar-est-desktop': { email: 'aprovar-est-desktop@teste.local', nome_social: 'Estudante Aprovação Desktop', pronomes: null, papel: 'estudante', status: 'pendente', recriar: true },
  'aprovar-prof-celular': { email: 'aprovar-prof-celular@teste.local', nome_social: 'Docente Aprovação Celular', pronomes: null, papel: 'estudante', status: 'pendente', recriar: true },
  'aprovar-prof-desktop': { email: 'aprovar-prof-desktop@teste.local', nome_social: 'Docente Aprovação Desktop', pronomes: null, papel: 'estudante', status: 'pendente', recriar: true },
} as const satisfies Record<string, Conta>

export type NomeConta = keyof typeof CONTAS

/** Arquivo de storageState (sessão já logada) de cada conta. */
export const estadoDe = (conta: NomeConta) => `e2e/.auth/${conta}.json`
