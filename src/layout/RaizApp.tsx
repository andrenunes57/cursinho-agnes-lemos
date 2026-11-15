import { useEffect, useRef, type MouseEvent } from 'react'
import { Outlet, useLocation } from 'react-router'
import { iniciarResgateDeFoco } from '../lib/foco'

/**
 * Leva o foco ao <h1> a cada troca de rota (SPEC §5.3), para o leitor de tela anunciar a
 * nova página. Na primeira carga não mexe no foco.
 */
function useFocoNoTitulo() {
  const { pathname } = useLocation()
  const primeiraVez = useRef(true)

  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false
      return
    }
    const quadro = requestAnimationFrame(() => {
      const titulo = document.querySelector<HTMLElement>('main h1')
      if (!titulo) return
      if (!titulo.hasAttribute('tabindex')) titulo.setAttribute('tabindex', '-1')
      titulo.focus()
    })
    return () => cancelAnimationFrame(quadro)
  }, [pathname])
}

/** Foca o <h1> do conteúdo (ou o próprio <main>), que não são focáveis por padrão. */
function focarConteudo(evento: MouseEvent<HTMLAnchorElement>) {
  const alvo = document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('main')
  if (!alvo) return
  evento.preventDefault()
  if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1')
  alvo.focus()
}

/** Raiz de todas as rotas: link "Pular para o conteúdo" + foco no título. */
export function RaizApp() {
  useFocoNoTitulo()
  // Foco que some junto com o elemento (formulário fechado, item excluído) volta para a página.
  useEffect(() => iniciarResgateDeFoco(), [])
  return (
    <>
      <a
        href="#conteudo"
        onClick={focarConteudo}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-superficie focus:px-4 focus:py-3 focus:font-semibold focus:text-marca"
      >
        Pular para o conteúdo
      </a>
      <Outlet />
    </>
  )
}
