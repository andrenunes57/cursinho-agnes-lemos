import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { gatilhoAtual, primeiroCampo, registrarRetorno } from '../../lib/foco'

/**
 * Envolve um formulário aberto por um botão na própria página ("Nova tarefa", "Editar …").
 * Ao abrir, leva o foco ao primeiro campo; ao fechar (salvar ou cancelar), devolve o foco ao
 * botão que o abriu, se ele voltar à página (SPEC §5.3). Não tem efeito visual (`contents`).
 */
export function FocarAoAbrir({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const gatilho = gatilhoAtual()
    registrarRetorno(null)
    primeiroCampo(ref.current)?.focus()
    return () => registrarRetorno(gatilho)
  }, [])

  return (
    <div ref={ref} className="contents">
      {children}
    </div>
  )
}
