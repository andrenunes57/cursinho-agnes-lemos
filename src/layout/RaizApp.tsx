import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router'

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

/** Raiz de todas as rotas: link "Pular para o conteúdo" + foco no título. */
export function RaizApp() {
  useFocoNoTitulo()
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-superficie focus:px-4 focus:py-3 focus:font-semibold focus:text-marca"
      >
        Pular para o conteúdo
      </a>
      <Outlet />
    </>
  )
}
