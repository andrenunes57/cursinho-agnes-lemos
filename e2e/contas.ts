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
}

// Contas do stack LOCAL (SPEC §14.3). Nunca existem na nuvem.
export const CONTAS = {
  coord: { email: 'coord@teste.local', nome_social: 'Coordenação Teste', pronomes: 'elu/delu', papel: 'coordenacao', status: 'ativo' },
  prof: { email: 'prof@teste.local', nome_social: 'Docente Teste', pronomes: 'ela/dela', papel: 'professor', status: 'ativo' },
  prof2: { email: 'prof2@teste.local', nome_social: 'Docente Dois', pronomes: 'ele/dele', papel: 'professor', status: 'ativo' },
  est: { email: 'est@teste.local', nome_social: 'Estudante Teste', pronomes: 'ela/dela', papel: 'estudante', status: 'ativo' },
  pend: { email: 'pend@teste.local', nome_social: 'Pessoa Pendente', pronomes: null, papel: 'estudante', status: 'pendente' },
  inativo: { email: 'inativo@teste.local', nome_social: 'Pessoa Inativa', pronomes: null, papel: 'estudante', status: 'inativo' },
  // Uma conta nova por projeto (celular/desktop), recriada a cada execução, para o onboarding.
  'novo-celular': { email: 'novo-celular@teste.local', nome_social: null, pronomes: null, papel: 'estudante', status: 'pendente' },
  'novo-desktop': { email: 'novo-desktop@teste.local', nome_social: null, pronomes: null, papel: 'estudante', status: 'pendente' },
} as const satisfies Record<string, Conta>

export type NomeConta = keyof typeof CONTAS

/** Arquivo de storageState (sessão já logada) de cada conta. */
export const estadoDe = (conta: NomeConta) => `e2e/.auth/${conta}.json`
