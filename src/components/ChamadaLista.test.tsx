import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { StatusPresenca } from '../lib/frequencia'
import { ChamadaLista } from './ChamadaLista'

const ESTUDANTES = [
  { id: 'a', nome_social: 'Ana', pronomes: 'ela/dela' },
  { id: 'b', nome_social: 'Bia', pronomes: null },
  { id: 'c', nome_social: 'Caio', pronomes: 'ele/dele' },
]

const grupo = (nome: string) => within(screen.getByRole('group', { name: nome }))

describe('ChamadaLista (RF-20/RF-21)', () => {
  it('todos começam como "presente"; alterna e envia o payload da RPC', async () => {
    const onSalvar = vi.fn()
    render(<ChamadaLista estudantes={ESTUDANTES} inicial={new Map()} podeEditar onSalvar={onSalvar} />)
    const usuario = userEvent.setup()

    expect(screen.getAllByRole('radio', { name: 'Presente', checked: true })).toHaveLength(3)
    expect(screen.getByText('Presentes: 3 · Ausentes: 0 · Justificadas: 0')).toBeInTheDocument()

    await usuario.click(grupo('Ana (ela/dela)').getByRole('radio', { name: 'Ausente' }))
    await usuario.click(grupo('Caio (ele/dele)').getByRole('radio', { name: 'Justificada' }))
    expect(screen.getByText('Presentes: 1 · Ausentes: 1 · Justificadas: 1')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Salvar chamada' }))
    expect(onSalvar).toHaveBeenCalledWith([
      { estudante_id: 'a', status: 'ausente' },
      { estudante_id: 'b', status: 'presente' },
      { estudante_id: 'c', status: 'justificada' },
    ])
  })

  it('reabre com o que foi salvo e permite corrigir', async () => {
    const onSalvar = vi.fn()
    const inicial = new Map<string, StatusPresenca>([['a', 'ausente'], ['b', 'justificada']])
    render(<ChamadaLista estudantes={ESTUDANTES} inicial={inicial} podeEditar onSalvar={onSalvar} />)
    const usuario = userEvent.setup()

    expect(grupo('Ana (ela/dela)').getByRole('radio', { name: 'Ausente' })).toBeChecked()
    expect(grupo('Bia').getByRole('radio', { name: 'Justificada' })).toBeChecked()
    // Matriculada depois da chamada: começa como presente.
    expect(grupo('Caio (ele/dele)').getByRole('radio', { name: 'Presente' })).toBeChecked()

    await usuario.click(grupo('Ana (ela/dela)').getByRole('radio', { name: 'Presente' }))
    await usuario.click(screen.getByRole('button', { name: 'Salvar chamada' }))
    expect(onSalvar).toHaveBeenCalledWith([
      { estudante_id: 'a', status: 'presente' },
      { estudante_id: 'b', status: 'justificada' },
      { estudante_id: 'c', status: 'presente' },
    ])
  })

  it('só leitura (coordenação): sem rádios e sem botão de salvar', () => {
    const inicial = new Map<string, StatusPresenca>([['a', 'ausente'], ['b', 'presente']])
    render(<ChamadaLista estudantes={ESTUDANTES} inicial={inicial} podeEditar={false} />)

    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar chamada' })).not.toBeInTheDocument()
    const lista = within(screen.getByRole('list', { name: 'Chamada da aula' }))
    expect(lista.getByText('Ausente')).toBeInTheDocument()
    expect(lista.getByText('Sem registro')).toBeInTheDocument()
    expect(screen.getByText('Presentes: 1 · Ausentes: 1 · Justificadas: 0')).toBeInTheDocument()
  })
})
