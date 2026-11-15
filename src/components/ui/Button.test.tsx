import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

/** Formulário que fica "salvando" até o teste mandar terminar. */
function Formulario({ onEnviar }: { onEnviar: () => void }) {
  const [salvando, setSalvando] = useState(false)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onEnviar()
        setSalvando(true)
      }}
    >
      <label>
        Nome <input />
      </label>
      <Button type="submit" carregando={salvando} textoCarregando="Salvando…">
        Salvar
      </Button>
      <button type="button" onClick={() => setSalvando(false)}>
        Terminar
      </button>
    </form>
  )
}

describe('Button', () => {
  it('durante o carregando, mantém o foco e fica com aria-disabled (não disabled)', async () => {
    const usuario = userEvent.setup()
    render(<Formulario onEnviar={() => {}} />)
    await usuario.tab()
    await usuario.tab()
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveFocus()

    await usuario.keyboard('{Enter}')

    const botao = screen.getByRole('button', { name: 'Salvando…' })
    expect(botao).toHaveFocus()
    expect(botao).toHaveAttribute('aria-disabled', 'true')
    expect(botao).not.toBeDisabled()
  })

  it('durante o carregando, não envia o formulário de novo (clique nem Enter no campo)', async () => {
    const usuario = userEvent.setup()
    const onEnviar = vi.fn()
    render(<Formulario onEnviar={onEnviar} />)

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(onEnviar).toHaveBeenCalledTimes(1)

    await usuario.click(screen.getByRole('button', { name: 'Salvando…' }))
    await usuario.type(screen.getByLabelText('Nome'), 'x{Enter}')
    expect(onEnviar).toHaveBeenCalledTimes(1)

    await usuario.click(screen.getByRole('button', { name: 'Terminar' }))
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(onEnviar).toHaveBeenCalledTimes(2)
  })

  it('durante o carregando, ignora o onClick', async () => {
    const usuario = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button carregando onClick={onClick}>
        Excluir
      </Button>,
    )
    await usuario.click(screen.getByRole('button', { name: 'Aguarde…' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('disabled continua desabilitando de verdade', () => {
    render(<Button disabled>Subir</Button>)
    expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled()
  })
})
