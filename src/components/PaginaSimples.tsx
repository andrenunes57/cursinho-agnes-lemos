import type { ReactNode } from 'react'

/** Página sem menu (públicas e de acesso): só o <main> centralizado, mobile-first. */
export function PaginaSimples({ children }: { children: ReactNode }) {
  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-4 py-8">
      {children}
    </main>
  )
}
