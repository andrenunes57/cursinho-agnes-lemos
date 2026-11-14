import type { Enums } from '../types/database'

export type Papel = Enums<'papel_usuario'>
export type Status = Enums<'status_usuario'>

/** Rótulos inclusivos dos papéis (SPEC §5.4). */
export const ROTULO_PAPEL: Record<Papel, string> = {
  estudante: 'Estudante',
  professor: 'Docente',
  coordenacao: 'Coordenação',
}

export const OPCOES_PAPEL = (['estudante', 'professor', 'coordenacao'] as const).map((valor) => ({
  valor,
  rotulo: ROTULO_PAPEL[valor],
}))
