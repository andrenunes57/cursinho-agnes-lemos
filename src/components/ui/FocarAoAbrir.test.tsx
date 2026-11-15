import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { iniciarResgateDeFoco } from '../../lib/foco'
import { FocarAoAbrir } from './FocarAoAbrir'

/** Página mínima: botão que vira formulário (como "Nova tarefa") e uma lista com exclusão. */
function Pagina() {
  useEffect(() => iniciarResgateDeFoco(), [])
  const [aberto, setAberto] = useState(false)
  const [itens, setItens] = useState(['Item A'])
  return (
    <main>
      <h1>Página</h1>
      {aberto ? (
        <FocarAoAbrir>
          <form onSubmit={(e) => (e.preventDefault(), setAberto(false))}>
            <label>
              Título <input />
            </label>
            <button type="submit">Salvar</button>
            <button type="button" onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </form>
        </FocarAoAbrir>
      ) : (
        <button type="button" onClick={() => setAberto(true)}>
          Nova tarefa
        </button>
      )}
      <ul>
        {itens.map((i) => (
          <li key={i}>
            <button type="button" aria-label={`Excluir ${i}`} onClick={() => setItens([])}>
              Excluir
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}

describe('FocarAoAbrir + resgate de foco', () => {
  it('ao abrir, foca o primeiro campo; ao cancelar, volta para o botão que abriu', async () => {
    const usuario = userEvent.setup()
    render(<Pagina />)

    await usuario.click(screen.getByRole('button', { name: 'Nova tarefa' }))
    expect(screen.getByLabelText('Título')).toHaveFocus()

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nova tarefa' })).toHaveFocus())
  })

  it('ao salvar pelo Enter, o foco volta para o botão que abriu', async () => {
    const usuario = userEvent.setup()
    render(<Pagina />)

    await usuario.click(screen.getByRole('button', { name: 'Nova tarefa' }))
    await usuario.keyboard('Prova{Enter}')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nova tarefa' })).toHaveFocus())
  })

  it('se o elemento focado some (item excluído), o foco vai para o <h1>, não para o <body>', async () => {
    const usuario = userEvent.setup()
    render(<Pagina />)

    await usuario.click(screen.getByRole('button', { name: 'Excluir Item A' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Página' })).toHaveFocus())
  })
})
