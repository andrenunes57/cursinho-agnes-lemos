import type { ReactNode } from 'react'

/** Texto de erro de campo, com ícone textual além da cor (SPEC §5.3). */
export function MensagemErro({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1 text-sm font-medium text-erro">
      <span aria-hidden="true">⚠</span> {children}
    </p>
  )
}
