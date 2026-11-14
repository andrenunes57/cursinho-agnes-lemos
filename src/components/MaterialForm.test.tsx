import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MB } from '../lib/arquivos'
import { MaterialForm } from './MaterialForm'

function abrir(props: Partial<Parameters<typeof MaterialForm>[0]> = {}) {
  const onEnviar = vi.fn()
  render(
    <MaterialForm maxBytes={15 * MB} arquivosDisponiveis enviando={false} onEnviar={onEnviar} onCancelar={vi.fn()} {...props} />,
  )
  return { usuario: userEvent.setup({ applyAccept: false }), onEnviar }
}

const salvar = () => screen.getByRole('button', { name: 'Salvar rascunho' })
const titulo = () => screen.getByLabelText(/Título do material/)

describe('MaterialForm (RF-11)', () => {
  it('arquivo: exige o arquivo, sugere o título e envia o File', async () => {
    const { usuario, onEnviar } = abrir()
    await usuario.click(salvar())
    expect(screen.getByLabelText(/Arquivo para enviar/)).toHaveFocus()
    expect(screen.getByText('Escolha o arquivo.')).toBeInTheDocument()

    const pdf = new File(['%PDF'], 'Lista 1.pdf', { type: 'application/pdf' })
    await usuario.upload(screen.getByLabelText(/Arquivo para enviar/), pdf)
    expect(titulo()).toHaveValue('Lista 1')
    expect(screen.getByText(/Escolhido: Lista 1.pdf/)).toBeInTheDocument()

    await usuario.click(salvar())
    expect(onEnviar).toHaveBeenCalledWith({ tipo: 'arquivo', titulo: 'Lista 1', arquivo: pdf })
  })

  it('arquivo: recusa vídeo e tipo fora da lista antes de enviar', async () => {
    const { usuario, onEnviar } = abrir()
    await usuario.upload(screen.getByLabelText(/Arquivo para enviar/), new File(['x'], 'aula.mp4', { type: 'video/mp4' }))
    await usuario.click(salvar())
    expect(screen.getByLabelText(/Arquivo para enviar/)).toHaveAccessibleDescription(/publique no YouTube/)

    await usuario.upload(screen.getByLabelText(/Arquivo para enviar/), new File(['x'], 'p.exe', { type: 'application/x-msdownload' }))
    await usuario.click(salvar())
    expect(screen.getByText(/Tipo de arquivo não aceito/)).toBeInTheDocument()
    expect(onEnviar).not.toHaveBeenCalled()
  })

  it('arquivo: avisa quando a API de Arquivos não está configurada', async () => {
    const { usuario, onEnviar } = abrir({ arquivosDisponiveis: false })
    await usuario.click(salvar())
    expect(screen.getByText(/ainda não foi configurado/)).toBeInTheDocument()
    expect(onEnviar).not.toHaveBeenCalled()
  })

  it('vídeo: só aceita link do YouTube', async () => {
    const { usuario, onEnviar } = abrir()
    await usuario.click(screen.getByRole('radio', { name: 'Vídeo do YouTube' }))
    await usuario.type(screen.getByLabelText(/Link do vídeo/), 'https://vimeo.com/123')
    await usuario.type(titulo(), 'Revisão')
    await usuario.click(salvar())
    expect(screen.getByLabelText(/Link do vídeo/)).toHaveFocus()
    expect(screen.getByText(/Use o link de um vídeo do YouTube/)).toBeInTheDocument()

    await usuario.clear(screen.getByLabelText(/Link do vídeo/))
    await usuario.type(screen.getByLabelText(/Link do vídeo/), 'https://youtu.be/dQw4w9WgXcQ')
    await usuario.click(salvar())
    expect(onEnviar).toHaveBeenCalledWith({ tipo: 'video', titulo: 'Revisão', url: 'https://youtu.be/dQw4w9WgXcQ' })
  })

  it('link: exige URL http(s)', async () => {
    const { usuario, onEnviar } = abrir()
    await usuario.click(screen.getByRole('radio', { name: 'Link' }))
    await usuario.type(screen.getByLabelText(/Endereço do link/), 'exemplo.org')
    await usuario.type(titulo(), 'Leitura')
    await usuario.click(salvar())
    expect(screen.getByText(/começando com https:\/\//)).toBeInTheDocument()

    await usuario.clear(screen.getByLabelText(/Endereço do link/))
    await usuario.type(screen.getByLabelText(/Endereço do link/), 'https://exemplo.org/texto')
    await usuario.click(salvar())
    expect(onEnviar).toHaveBeenCalledWith({ tipo: 'link', titulo: 'Leitura', url: 'https://exemplo.org/texto' })
  })

  it('texto: exige título e conteúdo', async () => {
    const { usuario, onEnviar } = abrir()
    await usuario.click(screen.getByRole('radio', { name: 'Texto' }))
    await usuario.click(salvar())
    expect(titulo()).toHaveFocus()
    expect(screen.getByText('Informe o título do material.')).toBeInTheDocument()
    expect(screen.getByText('Escreva o texto do material.')).toBeInTheDocument()

    await usuario.type(titulo(), 'Recado')
    await usuario.type(screen.getByLabelText(/Conteúdo do texto/), 'Tragam calculadora.')
    await usuario.click(salvar())
    expect(onEnviar).toHaveBeenCalledWith({ tipo: 'texto', titulo: 'Recado', conteudo: 'Tragam calculadora.' })
  })

  it('mostra "Enviando…" com o botão desabilitado durante o upload', () => {
    abrir({ enviando: true })
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled()
  })
})
