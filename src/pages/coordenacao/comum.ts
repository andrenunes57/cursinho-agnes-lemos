import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

export type Resultado = { tipo: 'sucesso' | 'erro'; texto: string }
export type AoResultado = (r: Resultado) => void

/**
 * Resultado da última ação da página ("Turma criada.", erro do banco…), mostrado num único
 * <Aviso> com aria-live (SPEC §5.3).
 */
export function useResultado(inicial: Resultado | null = null) {
  const [resultado, setResultado] = useState<Resultado | null>(inicial)
  const avisar = useCallback<AoResultado>((r) => setResultado(r), [])
  return { resultado, avisar }
}

/** "1 cadastro aprovado" / "3 cadastros aprovados". */
export function plural(n: number, singular: string, pluralTexto: string): string {
  return `${n} ${n === 1 ? singular : pluralTexto}`
}

/**
 * Aviso de sucesso deixado pela página anterior no `state` da navegação (ex.: "Aula criada." ao
 * abrir a aula recém-criada). O state é limpo em seguida, para o aviso não voltar ao recarregar.
 */
export function useResultadoComAvisoDaNavegacao() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { aviso?: unknown } | null
  const aviso = typeof state?.aviso === 'string' ? state.aviso : null
  const valor = useResultado(aviso ? { tipo: 'sucesso', texto: aviso } : null)

  useEffect(() => {
    if (aviso) void navigate(location.pathname + location.search, { replace: true, state: null })
  }, [aviso, navigate, location.pathname, location.search])

  return valor
}
