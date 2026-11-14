import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MENSAGEM_ERRO_RETORNO } from '../../lib/retornoOAuth'
import { supabase } from '../../lib/supabase'
import { authDeTeste, renderizar } from '../../test/renderizar'
import { Entrar } from './Entrar'

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { signInWithOAuth: vi.fn().mockResolvedValue({ error: null }) } },
  urlDeRetorno: () => 'http://localhost:5173/cursinho-agnes-lemos/',
}))

const abrirEm = (rota: string) => renderizar(<Entrar />, { rota, caminho: '/entrar' })

describe('Entrar (RF-01)', () => {
  it('mostra o botão de login e o link para o aviso de privacidade', () => {
    abrirEm('/entrar')
    expect(screen.getByRole('heading', { level: 1, name: /Agnes Lemos/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeEnabled()
    expect(screen.getByRole('link', { name: 'Aviso de privacidade' })).toHaveAttribute('href', '/privacidade')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('inicia o login com Google voltando para a base do app', async () => {
    abrirEm('/entrar')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar com Google' }))
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost:5173/cursinho-agnes-lemos/' },
    })
  })

  it('com ?error= mostra mensagem amigável e limpa a URL', () => {
    abrirEm('/entrar?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+expired')
    expect(screen.getByRole('alert')).toHaveTextContent(MENSAGEM_ERRO_RETORNO)
    expect(screen.getByTestId('local')).toHaveTextContent(/^\/entrar$/)
  })

  it('com erro no hash também mostra a mensagem', () => {
    abrirEm('/entrar#error=access_denied&error_description=cancelado')
    expect(screen.getByRole('alert')).toHaveTextContent(MENSAGEM_ERRO_RETORNO)
  })

  it('quem já tem sessão vai para o Início', () => {
    const auth = authDeTeste({ sessao: {} as never })
    renderizar(<Entrar />, { rota: '/entrar', caminho: '/entrar', auth })
    expect(screen.getByTestId('local')).toHaveTextContent(/^\/$/)
  })
})
