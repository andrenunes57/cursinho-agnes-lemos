import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MB } from '../lib/arquivos'
import type { Entrega } from '../pages/consultasTarefas'
import { EntregaForm } from './EntregaForm'

function abrir(props: Partial<Parameters<typeof EntregaForm>[0]> = {}) {
  const onEnviar = vi.fn()
  render(<EntregaForm anterior={null} maxBytes={15 * MB} arquivosDisponiveis enviando={false} onEnviar={onEnviar} {...props} />)
  return { usuario: userEvent.setup({ applyAccept: false }), onEnviar }
}

const anterior: Entrega = {
  id: 'e1',
  tarefa_id: 't1',
  estudante_id: 'u1',
  arquivo_id: 'arq-1',
  link: null,
  comentario: 'Primeira versão',
  enviada_em: '2026-11-14T12:00:00Z',
  nota: null,
  conceito: null,
  devolutiva: null,
  avaliada_em: null,
  arquivos: {
    id: 'arq-1',
    nome: 'foto.jpg',
    mime_type: 'image/jpeg',
    tamanho_bytes: 1000,
    url_visualizacao: 'https://drive.google.com/file/d/x/view',
  },
}

describe('EntregaForm (RF-16, RF-17)', () => {
  it('exige pelo menos um conteúdo', async () => {
    const { usuario, onEnviar } = abrir()
    await usuario.click(screen.getByRole('button', { name: 'Enviar entrega' }))
    expect(screen.getByLabelText(/Comentário/)).toHaveFocus()
    expect(screen.getByText(/pelo menos um: arquivo, link ou comentário/)).toBeInTheDocument()
    expect(onEnviar).not.toHaveBeenCalled()
  })

  it('envia arquivo, link e comentário juntos; valida o link', async () => {
    const { usuario, onEnviar } = abrir()
    const pdf = new File(['%PDF'], 'resposta.pdf', { type: 'application/pdf' })
    await usuario.upload(screen.getByLabelText(/^Arquivo/), pdf)
    await usuario.type(screen.getByLabelText(/Link/), 'docs.google.com')
    await usuario.click(screen.getByRole('button', { name: 'Enviar entrega' }))
    expect(screen.getByLabelText(/Link/)).toHaveFocus()

    await usuario.clear(screen.getByLabelText(/Link/))
    await usuario.type(screen.getByLabelText(/Link/), 'https://docs.google.com/d/1')
    await usuario.type(screen.getByLabelText(/Comentário/), 'Segue.')
    await usuario.click(screen.getByRole('button', { name: 'Enviar entrega' }))
    expect(onEnviar).toHaveBeenCalledWith({
      arquivo: { acao: 'enviar', arquivo: pdf },
      link: 'https://docs.google.com/d/1',
      comentario: 'Segue.',
    })
  })

  it('reenvio: mantém o arquivo anterior por padrão', async () => {
    const { usuario, onEnviar } = abrir({ anterior })
    expect(screen.getByRole('radio', { name: 'Manter foto.jpg' })).toBeChecked()
    expect(screen.getByLabelText(/Comentário/)).toHaveValue('Primeira versão')
    await usuario.click(screen.getByRole('button', { name: 'Reenviar entrega' }))
    expect(onEnviar).toHaveBeenCalledWith({ arquivo: { acao: 'manter' }, link: null, comentario: 'Primeira versão' })
  })

  it('reenvio: trocar exige o novo arquivo; remover sem outro conteúdo é recusado', async () => {
    const { usuario, onEnviar } = abrir({ anterior })
    await usuario.click(screen.getByRole('radio', { name: 'Trocar por outro arquivo' }))
    await usuario.click(screen.getByRole('button', { name: 'Reenviar entrega' }))
    expect(screen.getByText('Escolha o novo arquivo.')).toBeInTheDocument()

    const nova = new File(['x'], 'foto2.png', { type: 'image/png' })
    await usuario.upload(screen.getByLabelText(/Novo arquivo/), nova)
    await usuario.click(screen.getByRole('button', { name: 'Reenviar entrega' }))
    expect(onEnviar).toHaveBeenLastCalledWith({ arquivo: { acao: 'enviar', arquivo: nova }, link: null, comentario: 'Primeira versão' })

    await usuario.click(screen.getByRole('radio', { name: 'Remover o arquivo' }))
    await usuario.clear(screen.getByLabelText(/Comentário/))
    await usuario.click(screen.getByRole('button', { name: 'Reenviar entrega' }))
    expect(screen.getByText(/pelo menos um/)).toBeInTheDocument()
    expect(onEnviar).toHaveBeenCalledTimes(1)
  })
})
