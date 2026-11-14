import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ErroArquivos,
  MB,
  enviarArquivo,
  excluirArquivo,
  formatarTamanho,
  mensagemDoCodigo,
  mimeDoArquivo,
  paraBase64,
  validarArquivo,
  type ConfigArquivos,
} from './arquivos'

const arquivo = (nome: string, tipo: string, bytes = 10) => new File([new Uint8Array(bytes).fill(65)], nome, { type: tipo })

describe('validarArquivo (allowlist e limite, §10.4)', () => {
  const max = 15 * MB

  it.each([
    ['lista.pdf', 'application/pdf'],
    ['foto.jpg', 'image/jpeg'],
    ['print.png', 'image/png'],
    ['img.webp', 'image/webp'],
    ['anim.gif', 'image/gif'],
    ['texto.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['slides.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    ['planilha.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['texto.odt', 'application/vnd.oasis.opendocument.text'],
    ['notas.txt', 'text/plain'],
  ])('aceita %s', (nome, tipo) => {
    expect(validarArquivo(arquivo(nome, tipo), max)).toBeNull()
  })

  it('recusa tipo fora da allowlist', () => {
    expect(validarArquivo(arquivo('script.exe', 'application/x-msdownload'), max)).toMatch(/Tipo de arquivo não aceito/)
    expect(validarArquivo(arquivo('pagina.html', 'text/html'), max)).toMatch(/Tipo de arquivo não aceito/)
  })

  it('orienta a usar o YouTube para vídeo', () => {
    expect(validarArquivo(arquivo('aula.mp4', 'video/mp4'), max)).toMatch(/YouTube/)
  })

  it('aplica o limite de tamanho', () => {
    expect(validarArquivo({ name: 'a.pdf', type: 'application/pdf', size: 15 * MB }, max)).toBeNull()
    expect(validarArquivo({ name: 'a.pdf', type: 'application/pdf', size: 15 * MB + 1 }, max)).toBe(
      'O arquivo tem 15 MB e o limite é 15 MB.',
    )
    expect(validarArquivo({ name: 'a.pdf', type: 'application/pdf', size: 20 * MB }, max)).toMatch(/tem 20 MB/)
  })

  it('recusa arquivo vazio', () => {
    expect(validarArquivo(arquivo('a.pdf', 'application/pdf', 0), max)).toBe('O arquivo está vazio.')
  })

  it('deduz o tipo pela extensão quando o navegador não informa', () => {
    expect(mimeDoArquivo({ name: 'Trabalho.DOCX', type: '' })).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    expect(mimeDoArquivo({ name: 'sem-extensao', type: '' })).toBe('')
    expect(validarArquivo(arquivo('lista.pdf', ''), max)).toBeNull()
  })
})

describe('formatarTamanho e mensagens', () => {
  it('formata em pt-BR', () => {
    expect(formatarTamanho(350)).toBe('350 bytes')
    expect(formatarTamanho(2048)).toBe('2 KB')
    expect(formatarTamanho(1.5 * MB)).toBe('1,5 MB')
  })

  it('mapeia os códigos do protocolo (§10.2) para mensagens amigáveis', () => {
    expect(mensagemDoCodigo('TOKEN_INVALIDO')).toMatch(/sessão expirou/)
    expect(mensagemDoCodigo('EM_USO')).toMatch(/em uso/)
    expect(mensagemDoCodigo('ERRO_DRIVE')).toMatch(/Google Drive/)
    expect(mensagemDoCodigo('CODIGO_DESCONHECIDO')).toBe(mensagemDoCodigo('ERRO_INTERNO'))
    expect(new ErroArquivos('SEM_PERMISSAO').message).toMatch(/permissão/)
  })
})

describe('paraBase64', () => {
  it('converte o conteúdo', async () => {
    expect(await paraBase64(new Blob(['Olá']))).toBe(btoa(String.fromCharCode(...new TextEncoder().encode('Olá'))))
  })
})

describe('chamadas à API (fetch mockado)', () => {
  const URL_API = 'https://script.google.com/macros/s/abc/exec'
  const config: ConfigArquivos = { url: URL_API, maxBytes: 15 * MB, obterToken: async () => 'jwt-de-teste' }
  const meta = { id: 'id-1', nome: 'lista.pdf', mime_type: 'application/pdf', tamanho_bytes: 10, url_visualizacao: 'https://drive.google.com/file/d/x/view' }
  let fetchMock: ReturnType<typeof vi.fn>

  const responder = (corpo: unknown, init: ResponseInit = { status: 200 }) =>
    fetchMock.mockResolvedValueOnce(new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), init))

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('upload: POST text/plain com redirect follow e o JWT no corpo', async () => {
    responder({ ok: true, arquivo: meta })
    await expect(enviarArquivo(arquivo('lista.pdf', 'application/pdf'), 'material', config)).resolves.toEqual(meta)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(URL_API)
    expect(init.method).toBe('POST')
    expect(init.redirect).toBe('follow')
    expect(init.headers).toEqual({ 'Content-Type': 'text/plain;charset=utf-8' })
    expect(JSON.parse(init.body as string)).toEqual({
      action: 'upload',
      finalidade: 'material',
      nome: 'lista.pdf',
      mimeType: 'application/pdf',
      base64: btoa('A'.repeat(10)),
      accessToken: 'jwt-de-teste',
    })
  })

  it('não chama a API quando a validação do cliente falha', async () => {
    await expect(enviarArquivo(arquivo('aula.mp4', 'video/mp4'), 'material', config)).rejects.toMatchObject({
      codigo: 'TIPO_NAO_PERMITIDO',
      message: expect.stringMatching(/YouTube/),
    })
    await expect(
      enviarArquivo(arquivo('grande.pdf', 'application/pdf', 20), 'material', { ...config, maxBytes: 10 }),
    ).rejects.toMatchObject({ codigo: 'ARQUIVO_GRANDE' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('{ ok: false } vira ErroArquivos com o código', async () => {
    responder({ ok: false, erro: 'SEM_PERMISSAO', mensagem: 'x' })
    const erro = await enviarArquivo(arquivo('a.pdf', 'application/pdf'), 'material', config).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroArquivos)
    expect(erro).toMatchObject({ codigo: 'SEM_PERMISSAO' })
  })

  it('resposta que não é JSON e falha de rede viram mensagens amigáveis', async () => {
    responder('<html>Erro</html>')
    await expect(excluirArquivo('id-1', config)).rejects.toMatchObject({ codigo: 'RESPOSTA_INVALIDA' })

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(excluirArquivo('id-1', config)).rejects.toMatchObject({ codigo: 'SEM_CONEXAO' })

    responder('x', { status: 404 })
    await expect(excluirArquivo('id-1', config)).rejects.toMatchObject({ codigo: 'RESPOSTA_INVALIDA' })
  })

  it('delete manda o arquivoId', async () => {
    responder({ ok: true })
    await excluirArquivo('id-1', config)
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      action: 'delete',
      arquivoId: 'id-1',
      accessToken: 'jwt-de-teste',
    })
  })

  it('sem URL configurada ou sem sessão, nem chama a API', async () => {
    await expect(excluirArquivo('id-1', { ...config, url: '' })).rejects.toMatchObject({ codigo: 'NAO_CONFIGURADA' })
    await expect(excluirArquivo('id-1', { ...config, obterToken: async () => null })).rejects.toMatchObject({
      codigo: 'TOKEN_INVALIDO',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
