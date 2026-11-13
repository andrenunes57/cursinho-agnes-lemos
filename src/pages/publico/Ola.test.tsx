import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { supabase } from '../../lib/supabase'
import { Ola } from './Ola'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
  urlDeRetorno: () => 'http://localhost:5173/cursinho-agnes-lemos/',
}))

describe('Ola (página provisória da F0)', () => {
  it('mostra o título e o botão de login quando não há sessão', async () => {
    render(<Ola />)

    expect(screen.getByRole('heading', { level: 1, name: /Agnes Lemos/ })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Entrar com Google' })).toBeEnabled()
  })

  it('inicia o login com Google voltando para a base do app', async () => {
    render(<Ola />)

    await userEvent.click(await screen.findByRole('button', { name: 'Entrar com Google' }))

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost:5173/cursinho-agnes-lemos/' },
    })
  })
})
