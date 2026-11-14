// Cliente da API de Arquivos (Apps Script + Google Drive), SPEC §10.6.
// POST com Content-Type text/plain (sem preflight de CORS) e corpo JSON; a resposta é sempre
// HTTP 200 com { ok: true, ... } ou { ok: false, erro, mensagem } (§10.2).

import { comprimirImagem } from './imagem'

export type Finalidade = 'material' | 'entrega'

export type ArquivoMeta = {
  id: string
  nome: string
  mime_type: string
  tamanho_bytes: number
  url_visualizacao: string
}

export type ConfigArquivos = {
  /** URL /exec ativa (configuracoes.api_arquivos.url, com fallback VITE_API_ARQUIVOS_URL). */
  url: string
  maxBytes: number
  /** JWT da sessão atual (supabase.auth.getSession()). */
  obterToken: () => Promise<string | null>
}

export const MAX_MB_PADRAO = 15
export const MB = 1024 * 1024

// Allowlist de MIME (§10.4), com a extensão usada quando o navegador não informa o tipo.
const TIPOS: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.oasis.opendocument.text': ['odt'],
  'application/vnd.oasis.opendocument.presentation': ['odp'],
  'application/vnd.oasis.opendocument.spreadsheet': ['ods'],
  'text/plain': ['txt'],
}

export const TIPOS_PERMITIDOS: readonly string[] = Object.keys(TIPOS)

/** Valor do atributo `accept` do <input type="file">: tipos e extensões. */
export const ACCEPT = [...TIPOS_PERMITIDOS, ...Object.values(TIPOS).flat().map((e) => `.${e}`)].join(',')

export const DICA_TIPOS = 'PDF, imagem (JPG, PNG, WebP, GIF), Word, PowerPoint, Excel, LibreOffice ou texto'

const POR_EXTENSAO = new Map(Object.entries(TIPOS).flatMap(([tipo, exts]) => exts.map((e) => [e, tipo] as const)))

/** MIME do arquivo; se o navegador não informar (acontece no Android), deduz pela extensão. */
export function mimeDoArquivo(arquivo: { name: string; type: string }): string {
  if (arquivo.type) return arquivo.type
  const extensao = /\.([^.]+)$/.exec(arquivo.name)?.[1]?.toLowerCase() ?? ''
  return POR_EXTENSAO.get(extensao) ?? ''
}

const fmtNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** 350 → "350 bytes"; 2048 → "2 KB"; 1_572_864 → "1,5 MB". */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < MB) return `${fmtNumero.format(bytes / 1024)} KB`
  return `${fmtNumero.format(bytes / MB)} MB`
}

export const MENSAGEM_VIDEO = 'Vídeo não é enviado como arquivo: publique no YouTube como “não listado” e cole o link.'

/** Validação do tipo (antes de comprimir). */
export function validarTipo(arquivo: { name: string; type: string }): string | null {
  const tipo = mimeDoArquivo(arquivo)
  if (tipo.startsWith('video/')) return MENSAGEM_VIDEO
  if (!TIPOS_PERMITIDOS.includes(tipo)) return `Tipo de arquivo não aceito. Envie ${DICA_TIPOS}.`
  return null
}

/** Validação completa do cliente (§10.4: allowlist + limite), com mensagem pt-BR ou null. */
export function validarArquivo(arquivo: { name: string; type: string; size: number }, maxBytes: number): string | null {
  const erroTipo = validarTipo(arquivo)
  if (erroTipo) return erroTipo
  if (arquivo.size === 0) return 'O arquivo está vazio.'
  if (arquivo.size > maxBytes) {
    return `O arquivo tem ${formatarTamanho(arquivo.size)} e o limite é ${formatarTamanho(maxBytes)}.`
  }
  return null
}

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------
const MENSAGENS: Record<string, string> = {
  REQUISICAO_INVALIDA: 'A API de Arquivos recusou o pedido. Tente de novo.',
  TOKEN_INVALIDO: 'Sua sessão expirou. Saia e entre de novo.',
  ARQUIVO_GRANDE: 'O arquivo passa do limite de tamanho.',
  TIPO_NAO_PERMITIDO: `Tipo de arquivo não aceito. Envie ${DICA_TIPOS}.`,
  SEM_PERMISSAO: 'Você não tem permissão para fazer isso com este arquivo.',
  NAO_ENCONTRADO: 'O arquivo não foi encontrado. Talvez já tenha sido excluído.',
  EM_USO: 'O arquivo ainda está em uso por um material ou uma entrega.',
  ERRO_DRIVE: 'O Google Drive não conseguiu gravar o arquivo. Tente de novo em instantes.',
  ERRO_INTERNO: 'Erro inesperado na API de Arquivos. Tente de novo.',
  // Códigos só do cliente:
  NAO_CONFIGURADA: 'O envio de arquivos ainda não foi configurado. Fale com a coordenação.',
  SEM_CONEXAO: 'Não foi possível falar com a API de Arquivos. Confira sua conexão e tente de novo.',
  RESPOSTA_INVALIDA: 'A API de Arquivos respondeu de um jeito inesperado. Tente de novo.',
}

export class ErroArquivos extends Error {
  readonly codigo: string
  constructor(codigo: string, mensagem?: string) {
    super(mensagem ?? MENSAGENS[codigo] ?? MENSAGENS.ERRO_INTERNO)
    this.name = 'ErroArquivos'
    this.codigo = codigo
  }
}

/** Mensagem amigável para qualquer erro do fluxo de arquivos. */
export function mensagemDoCodigo(codigo: string): string {
  return MENSAGENS[codigo] ?? MENSAGENS.ERRO_INTERNO
}

// ---------------------------------------------------------------------------
// Chamadas
// ---------------------------------------------------------------------------
type RespostaApi = { ok: true; [k: string]: unknown } | { ok: false; erro?: string; mensagem?: string }

async function chamar(config: ConfigArquivos, corpo: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!config.url) throw new ErroArquivos('NAO_CONFIGURADA')
  const accessToken = await config.obterToken()
  if (!accessToken) throw new ErroArquivos('TOKEN_INVALIDO')

  let resposta: Response
  try {
    resposta = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...corpo, accessToken }),
      redirect: 'follow',
    })
  } catch {
    throw new ErroArquivos('SEM_CONEXAO')
  }
  if (!resposta.ok) throw new ErroArquivos('RESPOSTA_INVALIDA')

  let json: RespostaApi
  try {
    json = (await resposta.json()) as RespostaApi
  } catch {
    throw new ErroArquivos('RESPOSTA_INVALIDA')
  }
  if (!json || typeof json !== 'object') throw new ErroArquivos('RESPOSTA_INVALIDA')
  if (json.ok !== true) throw new ErroArquivos(typeof json.erro === 'string' ? json.erro : 'ERRO_INTERNO')
  return json
}

/** Conteúdo do arquivo em base64 (em blocos, para não estourar a pilha com arquivos grandes). */
export async function paraBase64(arquivo: Blob): Promise<string> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  let binario = ''
  const BLOCO = 0x8000
  for (let i = 0; i < bytes.length; i += BLOCO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + BLOCO))
  }
  return btoa(binario)
}

/** Valida, comprime imagem, converte para base64 e envia (§10.3 upload). */
export async function enviarArquivo(arquivo: File, finalidade: Finalidade, config: ConfigArquivos): Promise<ArquivoMeta> {
  const erroTipo = validarTipo(arquivo)
  if (erroTipo) throw new ErroArquivos('TIPO_NAO_PERMITIDO', erroTipo)

  const final = await comprimirImagem(arquivo)
  const erro = validarArquivo(final, config.maxBytes)
  if (erro) throw new ErroArquivos('ARQUIVO_GRANDE', erro)

  const json = await chamar(config, {
    action: 'upload',
    finalidade,
    nome: final.name,
    mimeType: mimeDoArquivo(final),
    base64: await paraBase64(final),
  })
  const meta = json.arquivo as ArquivoMeta | undefined
  if (!meta?.id) throw new ErroArquivos('RESPOSTA_INVALIDA')
  return meta
}

/** Exclui a linha em `arquivos` e manda o arquivo para a lixeira do Drive (§10.3 delete). */
export async function excluirArquivo(arquivoId: string, config: ConfigArquivos): Promise<void> {
  await chamar(config, { action: 'delete', arquivoId })
}

/** Uso do Drive (só coordenação, §10.3 status). */
export async function statusArmazenamento(
  config: ConfigArquivos,
): Promise<{ usadoBytes: number; limiteBytes: number; conta: string }> {
  const json = await chamar(config, { action: 'status' })
  return { usadoBytes: Number(json.usadoBytes), limiteBytes: Number(json.limiteBytes), conta: String(json.conta) }
}
