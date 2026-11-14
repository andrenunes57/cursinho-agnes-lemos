import { useCallback, useState } from 'react'

export type Resultado = { tipo: 'sucesso' | 'erro'; texto: string }
export type AoResultado = (r: Resultado) => void

/**
 * Resultado da última ação da página ("Turma criada.", erro do banco…), mostrado num único
 * <Aviso> com aria-live (SPEC §5.3).
 */
export function useResultado() {
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const avisar = useCallback<AoResultado>((r) => setResultado(r), [])
  return { resultado, avisar }
}

/** "1 cadastro aprovado" / "3 cadastros aprovados". */
export function plural(n: number, singular: string, pluralTexto: string): string {
  return `${n} ${n === 1 ? singular : pluralTexto}`
}
