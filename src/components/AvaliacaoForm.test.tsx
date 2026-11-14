import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AvaliacaoForm } from './AvaliacaoForm'

type Props = Parameters<typeof AvaliacaoForm>[0]

function abrir(props: Partial<Props> & Pick<Props, 'tipo'>) {
  const onEnviar = vi.fn()
  render(<AvaliacaoForm conceitos={null} enviando={false} onEnviar={onEnviar} {...props} />)
  return { usuario: userEvent.setup(), onEnviar }
}

const salvar = () => screen.getByRole('button', { name: /avaliação/ })

describe('AvaliacaoForm (RF-18): campos por tipo', () => {
  it('nota: só nota + devolutiva opcional; aceita vírgula e recusa fora de 0–10', async () => {
    const { usuario, onEnviar } = abrir({ tipo: 'nota' })
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()

    await usuario.click(salvar())
    expect(screen.getByLabelText(/Nota/)).toHaveFocus()
    expect(screen.getByText('Informe a nota.')).toBeInTheDocument()

    await usuario.type(screen.getByLabelText(/Nota/), '10,5')
    await usuario.click(salvar())
    expect(screen.getByText(/de 0 a 10, com/)).toBeInTheDocument()
    expect(onEnviar).not.toHaveBeenCalled()

    await usuario.clear(screen.getByLabelText(/Nota/))
    await usuario.type(screen.getByLabelText(/Nota/), '7,5')
    await usuario.click(salvar())
    expect(onEnviar).toHaveBeenCalledWith({ nota: 7.5, conceito: null, devolutiva: null })
  })

  it('conceito: rádios com as opções da tarefa; exige escolher', async () => {
    const { usuario, onEnviar } = abrir({ tipo: 'conceito', conceitos: ['Satisfatório', 'Precisa revisar'] })
    expect(screen.queryByLabelText(/Nota/)).not.toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(2)

    await usuario.click(salvar())
    expect(screen.getByText('Escolha um conceito.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Satisfatório' })).toHaveFocus()

    await usuario.click(screen.getByRole('radio', { name: 'Precisa revisar' }))
    await usuario.type(screen.getByLabelText(/Devolutiva/), '  Revise a questão 2.  ')
    await usuario.click(salvar())
    expect(onEnviar).toHaveBeenCalledWith({ nota: null, conceito: 'Precisa revisar', devolutiva: 'Revise a questão 2.' })
  })

  it('devolutiva: só o texto, que passa a ser obrigatório', async () => {
    const { usuario, onEnviar } = abrir({ tipo: 'devolutiva' })
    expect(screen.queryByLabelText(/Nota/)).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()

    await usuario.click(salvar())
    expect(screen.getByLabelText(/Devolutiva/)).toHaveFocus()
    expect(screen.getByText('Escreva a devolutiva.')).toBeInTheDocument()

    await usuario.type(screen.getByLabelText(/Devolutiva/), 'Ótimo trabalho.')
    await usuario.click(salvar())
    expect(onEnviar).toHaveBeenCalledWith({ nota: null, conceito: null, devolutiva: 'Ótimo trabalho.' })
  })

  it('reavaliar: vem preenchido e o botão diz "Atualizar"', () => {
    abrir({ tipo: 'nota', inicial: { nota: 8.5, conceito: null, devolutiva: 'Bom.', avaliada_em: '2026-11-14T12:00:00Z' } })
    expect(screen.getByLabelText(/Nota/)).toHaveValue('8,5')
    expect(screen.getByLabelText(/Devolutiva/)).toHaveValue('Bom.')
    expect(screen.getByRole('button', { name: 'Atualizar avaliação' })).toBeInTheDocument()
  })
})
