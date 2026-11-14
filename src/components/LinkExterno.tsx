import type { ReactNode } from 'react'
import { partesComLinks } from '../lib/texto'
import { ehUrlHttp } from '../lib/validacoes'

export const classeLink = 'font-semibold text-marca underline underline-offset-4 hover:text-marca-escura'

/** Link que abre em nova aba, avisando o leitor de tela. Só aceita http(s). */
export function LinkExterno({ href, children }: { href: string; children: ReactNode }) {
  if (!ehUrlHttp(href)) return <span className="break-all">{children}</span>
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`break-all ${classeLink}`}>
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  )
}

/** Texto simples com quebras de linha preservadas e links http(s) clicáveis. */
export function TextoComLinks({ texto }: { texto: string }) {
  return (
    <p className="whitespace-pre-wrap break-words">
      {partesComLinks(texto).map((parte, i) =>
        parte.tipo === 'link' ? (
          <LinkExterno key={i} href={parte.valor}>
            {parte.valor}
          </LinkExterno>
        ) : (
          <span key={i}>{parte.valor}</span>
        ),
      )}
    </p>
  )
}
