import { useLocation } from 'react-router'

/** Mostra o caminho e a query atuais, para conferir redirecionamentos e limpeza de URL. */
export function LocalAtual() {
  const { pathname, search, hash } = useLocation()
  return <output data-testid="local">{pathname + search + hash}</output>
}
