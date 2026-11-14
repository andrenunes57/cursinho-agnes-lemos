import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AulaForm } from './AulaForm'

const TURMAS = [{ valor: 't1', rotulo: 'Turma 2027 (2027)' }]
const DISCIPLINAS = [{ valor: 'd1', rotulo: 'Matemática' }]
const DOCENTES = [{ valor: 'p1', rotulo: 'Docente Teste (ela/dela)' }]

function abrir(props: Partial<Parameters<typeof AulaForm>[0]> = {}) {
  const onEnviar = vi.fn()
  render(
    <AulaForm
      turmas={TURMAS}
      disciplinas={DISCIPLINAS}
      docentes={DOCENTES}
      enviando={false}
      textoBotao="Criar aula"
      onEnviar={onEnviar}
      {...props}
    />,
  )
  return { usuario: userEvent.setup(), onEnviar }
}

const titulo = () => screen.getByLabelText(/Título da aula/)
const criar = () => screen.getByRole('button', { name: 'Criar aula' })

describe('AulaForm (RF-09/RF-10)', () => {
  it('mostra os erros dos obrigatórios e foca o primeiro', async () => {
    const { usuario, onEnviar } = abrir()
    await usuario.click(criar())

    expect(titulo()).toHaveFocus()
    expect(titulo()).toHaveAccessibleDescription(/Informe o título da aula/)
    expect(screen.getByText('Escolha a turma.')).toBeInTheDocument()
    expect(screen.getByText('Escolha a disciplina.')).toBeInTheDocument()
    expect(screen.getByText('Escolha quem dá a aula.')).toBeInTheDocument()
    expect(screen.getByText('Informe a data da aula.')).toBeInTheDocument()
    expect(onEnviar).not.toHaveBeenCalled()
  })

  it('título com 2 a 120 caracteres (CHECK do banco)', async () => {
    const { usuario } = abrir()
    await usuario.type(titulo(), 'A')
    await usuario.click(criar())
    expect(screen.getByText('Use pelo menos 2 caracteres.')).toBeInTheDocument()

    await usuario.clear(titulo())
    await usuario.type(titulo(), 'a'.repeat(121))
    expect(screen.getByText('Use no máximo 120 caracteres.')).toBeInTheDocument()
  })

  it('envia os dados, com título sem espaços e início opcional nulo', async () => {
    const { usuario, onEnviar } = abrir({ inicial: { data: '2026-11-16' } })
    await usuario.type(titulo(), '  Funções  ')
    await usuario.selectOptions(screen.getByLabelText(/^Turma/), 't1')
    await usuario.selectOptions(screen.getByLabelText(/^Disciplina/), 'd1')
    await usuario.selectOptions(screen.getByLabelText(/^Docente/), 'p1')
    await usuario.click(criar())

    expect(onEnviar).toHaveBeenCalledWith({
      turma_id: 't1',
      disciplina_id: 'd1',
      professor_id: 'p1',
      data: '2026-11-16',
      inicio: null,
      titulo: 'Funções',
    })
  })

  it('sem a lista de docentes, não mostra o campo e usa o docente inicial', async () => {
    const { usuario, onEnviar } = abrir({
      docentes: undefined,
      inicial: { turma_id: 't1', disciplina_id: 'd1', professor_id: 'eu', data: '2026-11-16', inicio: '14:00:00', titulo: 'Aula' },
    })
    expect(screen.queryByLabelText(/^Docente/)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Horário de início/)).toHaveValue('14:00')
    await usuario.click(criar())
    expect(onEnviar).toHaveBeenCalledWith(expect.objectContaining({ professor_id: 'eu', inicio: '14:00' }))
  })
})
