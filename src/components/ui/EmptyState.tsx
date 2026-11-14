import type { ReactNode } from 'react'

type Props = { titulo: string; children?: ReactNode }

/** Estado vazio com orientação (SPEC §11, estados obrigatórios). */
export function EmptyState({ titulo, children }: Props) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border-2 border-dashed border-borda bg-superficie p-6">
      <p className="text-lg font-semibold">{titulo}</p>
      {children && <div className="text-texto-suave">{children}</div>}
    </div>
  )
}
