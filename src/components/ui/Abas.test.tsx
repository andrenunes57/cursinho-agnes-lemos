import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderizar } from '../../test/renderizar'
import { Abas } from './Abas'

const ABAS = [
  { id: 'a', rotulo: 'Primeira' },
  { id: 'b', rotulo: 'Segunda' },
  { id: 'c', rotulo: 'Terceira' },
] as const

function abrir(rota = '/') {
  renderizar(
    <Abas rotulo="Exemplo" abas={ABAS}>
      {(ativa) => <p>Conteúdo {ativa}</p>}
    </Abas>,
    { rota },
  )
  return userEvent.setup()
}

const aba = (nome: string) => screen.getByRole('tab', { name: nome })

describe('Abas (padrão ARIA)', () => {
  it('começa na primeira aba, que é a única no Tab', () => {
    abrir()
    expect(screen.getByRole('tablist', { name: 'Exemplo' })).toBeInTheDocument()
    expect(aba('Primeira')).toHaveAttribute('aria-selected', 'true')
    expect(aba('Primeira')).toHaveAttribute('tabindex', '0')
    expect(aba('Segunda')).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tabpanel', { name: 'Primeira' })).toHaveTextContent('Conteúdo a')
  })

  it('lê a aba ativa de ?aba=', () => {
    abrir('/?aba=c')
    expect(aba('Terceira')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Conteúdo c')
  })

  it('setas, Home e End trocam de aba, movem o foco e atualizam a URL', async () => {
    const usuario = abrir()
    await usuario.click(aba('Primeira'))

    await usuario.keyboard('{ArrowRight}')
    expect(aba('Segunda')).toHaveFocus()
    expect(aba('Segunda')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('local')).toHaveTextContent('/?aba=b')

    await usuario.keyboard('{End}')
    expect(aba('Terceira')).toHaveFocus()

    await usuario.keyboard('{ArrowRight}')
    expect(aba('Primeira')).toHaveFocus()

    await usuario.keyboard('{ArrowLeft}')
    expect(aba('Terceira')).toHaveFocus()

    await usuario.keyboard('{Home}')
    expect(aba('Primeira')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Conteúdo a')
  })

  it('clique seleciona a aba', async () => {
    const usuario = abrir()
    await usuario.click(aba('Segunda'))
    expect(aba('Segunda')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Conteúdo b')
  })
})
