import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { AuthContext, type EstadoAuth, type Perfil } from '../auth/contexto'
import { LocalAtual } from './LocalAtual'

export const perfilDeTeste = (parcial: Partial<Perfil> = {}): Perfil => ({
  id: 'uid-teste',
  email: 'pessoa@teste.local',
  nome_social: null,
  pronomes: null,
  papel: 'estudante',
  status: 'pendente',
  consentimento_em: null,
  ...parcial,
})

export const authDeTeste = (parcial: Partial<EstadoAuth> = {}): EstadoAuth => ({
  carregando: false,
  sessao: null,
  perfil: null,
  erroPerfil: false,
  recarregarPerfil: vi.fn(),
  sair: vi.fn().mockResolvedValue(undefined),
  ...parcial,
})

/** Renderiza uma página com React Query, contexto de auth falso e roteador em memória. */
export function renderizar(
  elemento: ReactElement,
  { rota = '/', caminho = '*', auth = authDeTeste() }: { rota?: string; caminho?: string; auth?: EstadoAuth } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[rota]}>
          <Routes>
            <Route path={caminho} element={elemento} />
            <Route path="*" element={null} />
          </Routes>
          <LocalAtual />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}
