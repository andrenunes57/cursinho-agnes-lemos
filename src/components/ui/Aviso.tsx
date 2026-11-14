import { Children, type ReactNode } from 'react'

type Props = { tipo?: 'sucesso' | 'erro'; children?: ReactNode }

/**
 * Região de aviso anunciada por leitor de tela (aria-live, SPEC §5.3).
 * Fica sempre no DOM para que a mudança de texto seja anunciada.
 */
export function Aviso({ tipo = 'sucesso', children }: Props) {
  const estilo =
    tipo === 'erro' ? 'border-erro bg-erro-fundo text-erro' : 'border-sucesso bg-sucesso-fundo text-sucesso'
  // Children.toArray descarta null/false: sem mensagem, a região fica vazia (mas presente).
  const temConteudo = Children.toArray(children).length > 0
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'}>
      {temConteudo && <p className={`rounded-lg border-l-4 px-4 py-3 font-medium ${estilo}`}>{children}</p>}
    </div>
  )
}
