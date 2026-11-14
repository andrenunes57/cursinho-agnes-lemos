import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TarefaForm } from './TarefaForm'

// TarefaForm usa consultasTarefas, que importa o cliente (variáveis ausentes no CI).
vi.mock('../lib/supabase', () => ({ supabase: {} }))

function abrir(props: Partial<Parameters<typeof TarefaForm>[0]> = {}) {
  const onEnviar = vi.fn()
  render(<TarefaForm enviando={false} textoBotao="Criar tarefa" onEnviar={onEnviar} onCancelar={vi.fn()} {...props} />)
  return { usuario: userEvent.setup(), onEnviar }
}

const criar = () => screen.getByRole('button', { name: 'Criar tarefa' })

describe('TarefaForm (RF-15)', () => {
  it('exige título; por padrão é nota, sem prazo e em rascunho', async () => {
    const { usuario, onEnviar } = abrir()
    await usuario.click(criar())
    expect(screen.getByLabelText(/Título da tarefa/)).toHaveFocus()
    expect(onEnviar).not.toHaveBeenCalled()

    await usuario.type(screen.getByLabelText(/Título da tarefa/), 'Lista 1')
    await usuario.click(criar())
    expect(onEnviar).toHaveBeenCalledWith({
      titulo: 'Lista 1',
      instrucoes: null,
      prazo: null,
      tipo_avaliacao: 'nota',
      opcoes_conceito: null,
      publicada: false,
    })
  })

  it('conceito: começa com os conceitos padrão, um por linha; publicar agora', async () => {
    const { usuario, onEnviar } = abrir()
    await usuario.type(screen.getByLabelText(/Título da tarefa/), 'Redação 1')
    await usuario.click(screen.getByRole('radio', { name: 'Conceito' }))
    expect(screen.getByLabelText(/Conceitos possíveis/)).toHaveValue('Satisfatório\nPrecisa revisar')

    await usuario.clear(screen.getByLabelText(/Conceitos possíveis/))
    await usuario.click(criar())
    expect(screen.getByLabelText(/Conceitos possíveis/)).toHaveFocus()

    await usuario.type(screen.getByLabelText(/Conceitos possíveis/), 'A{Enter}B{Enter}C')
    await usuario.click(screen.getByRole('checkbox', { name: /Publicar agora/ }))
    await usuario.click(criar())
    expect(onEnviar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_avaliacao: 'conceito', opcoes_conceito: ['A', 'B', 'C'], publicada: true }),
    )
  })

  it('prazo em hora de São Paulo vira ISO em UTC', async () => {
    const { usuario, onEnviar } = abrir()
    await usuario.type(screen.getByLabelText(/Título da tarefa/), 'Lista 2')
    await usuario.type(screen.getByLabelText(/Prazo/), '2026-11-20T23:59')
    await usuario.click(criar())
    expect(onEnviar).toHaveBeenCalledWith(expect.objectContaining({ prazo: '2026-11-21T02:59:00.000Z' }))
  })

  it('edição com avaliação travada: sem rádios de tipo e sem "publicar agora"', () => {
    abrir({
      textoBotao: 'Salvar tarefa',
      avaliacaoTravada: true,
      inicial: {
        id: 't1',
        aula_id: 'a1',
        titulo: 'Redação',
        instrucoes: null,
        prazo: '2026-11-21T02:59:00Z',
        tipo_avaliacao: 'conceito',
        opcoes_conceito: ['Bom', 'Refazer'],
        publicada: true,
      },
    })
    expect(screen.getByLabelText(/Prazo/)).toHaveValue('2026-11-20T23:59')
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.getByText(/Conceitos: Bom, Refazer/)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
