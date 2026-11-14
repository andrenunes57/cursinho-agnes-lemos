import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authDeTeste, perfilDeTeste, renderizar } from '../../test/renderizar'
import { PrimeiroAcesso } from './PrimeiroAcesso'

const mocks = vi.hoisted(() => {
  const eq = vi.fn()
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))
  return { eq, update, from }
})

vi.mock('../../lib/supabase', () => ({ supabase: { from: mocks.from } }))

function abrir() {
  const auth = authDeTeste({ perfil: perfilDeTeste({ id: 'uid-1' }) })
  renderizar(<PrimeiroAcesso />, { rota: '/primeiro-acesso', auth })
  return userEvent.setup()
}

const campoNome = () => screen.getByLabelText(/Nome social/)
const aceite = () => screen.getByRole('checkbox', { name: /aviso de privacidade/ })
const continuar = () => screen.getByRole('button', { name: 'Continuar' })

describe('PrimeiroAcesso (RF-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.eq.mockResolvedValue({ error: null })
  })

  it('começa sem nenhum dado preenchido (nada vem do Google)', () => {
    abrir()
    expect(campoNome()).toHaveValue('')
    expect(screen.getByRole('radio', { name: 'Prefiro não informar' })).toBeChecked()
    expect(aceite()).not.toBeChecked()
  })

  it('exige o nome social e leva o foco até o campo', async () => {
    const usuario = abrir()
    await usuario.click(continuar())

    expect(screen.getByText('Informe seu nome social.')).toBeInTheDocument()
    expect(campoNome()).toHaveFocus()
    expect(campoNome()).toHaveAttribute('aria-invalid', 'true')
    expect(campoNome()).toHaveAccessibleDescription(/Informe seu nome social/)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('aplica os limites de 2 a 80 caracteres', async () => {
    const usuario = abrir()
    await usuario.type(campoNome(), 'A')
    await usuario.click(continuar())
    expect(screen.getByText('Use pelo menos 2 caracteres.')).toBeInTheDocument()

    await usuario.clear(campoNome())
    await usuario.type(campoNome(), 'a'.repeat(81))
    expect(screen.getByText('Use no máximo 80 caracteres.')).toBeInTheDocument()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('"outro" mostra um campo próprio, obrigatório e com até 30 caracteres', async () => {
    const usuario = abrir()
    expect(screen.queryByLabelText(/Quais são seus pronomes/)).not.toBeInTheDocument()

    await usuario.type(campoNome(), 'Ana')
    await usuario.click(screen.getByRole('radio', { name: 'Outro' }))
    await usuario.click(aceite())
    await usuario.click(continuar())
    expect(screen.getByText('Escreva seus pronomes ou escolha outra opção.')).toBeInTheDocument()

    await usuario.type(screen.getByLabelText(/Quais são seus pronomes/), 'x'.repeat(31))
    expect(screen.getByText('Use no máximo 30 caracteres.')).toBeInTheDocument()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('exige o aceite do aviso de privacidade', async () => {
    const usuario = abrir()
    await usuario.type(campoNome(), 'Ana')
    await usuario.click(continuar())

    expect(screen.getByText('Para continuar, aceite o aviso de privacidade.')).toBeInTheDocument()
    expect(aceite()).toHaveFocus()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('grava nome social sem espaços, pronomes e a data do consentimento', async () => {
    const usuario = abrir()
    await usuario.type(campoNome(), '  Ana Souza  ')
    await usuario.click(screen.getByRole('radio', { name: 'elu/delu' }))
    await usuario.click(aceite())
    await usuario.click(continuar())

    await waitFor(() => expect(mocks.eq).toHaveBeenCalledWith('id', 'uid-1'))
    expect(mocks.from).toHaveBeenCalledWith('perfis')
    expect(mocks.update).toHaveBeenCalledWith({
      nome_social: 'Ana Souza',
      pronomes: 'elu/delu',
      consentimento_em: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    })
  })

  it('"outro" grava o texto livre', async () => {
    const usuario = abrir()
    await usuario.type(campoNome(), 'Ana')
    await usuario.click(screen.getByRole('radio', { name: 'Outro' }))
    await usuario.type(screen.getByLabelText(/Quais são seus pronomes/), ' ile/dile ')
    await usuario.click(aceite())
    await usuario.click(continuar())

    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ pronomes: 'ile/dile' })))
  })

  it('quem já fez o onboarding vai para o Início', () => {
    const perfil = perfilDeTeste({ nome_social: 'Ana', consentimento_em: '2026-11-13T10:00:00Z' })
    renderizar(<PrimeiroAcesso />, { rota: '/primeiro-acesso', caminho: '/primeiro-acesso', auth: authDeTeste({ perfil }) })
    expect(screen.getByTestId('local')).toHaveTextContent(/^\/$/)
  })
})
