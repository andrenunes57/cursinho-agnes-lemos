// Compressão de imagens no navegador antes do envio (SPEC RF-14, P1): fotos do celular com mais
// de 1600 px ou mais de 500 KB viram JPEG de qualidade ~0,8 com o lado maior em até 1600 px.

export const LADO_MAXIMO = 1600
export const BYTES_SEM_COMPRIMIR = 500 * 1024
export const QUALIDADE_JPEG = 0.8

// GIF fica de fora (perderia a animação).
const TIPOS_COMPRIMIVEIS = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type InfoImagem = { tipo: string; bytes: number; largura: number; altura: number }

export function ehComprimivel(tipo: string): boolean {
  return TIPOS_COMPRIMIVEIS.has(tipo)
}

/** Decide se vale comprimir: tipo aceito e (arquivo grande ou lado maior que o limite). */
export function precisaComprimir({ tipo, bytes, largura, altura }: InfoImagem): boolean {
  if (!ehComprimivel(tipo)) return false
  return bytes > BYTES_SEM_COMPRIMIR || Math.max(largura, altura) > LADO_MAXIMO
}

/** Novas dimensões, mantendo a proporção, com o lado maior em até LADO_MAXIMO. */
export function dimensoesReduzidas(largura: number, altura: number): { largura: number; altura: number } {
  const escala = Math.min(1, LADO_MAXIMO / Math.max(largura, altura))
  return { largura: Math.max(1, Math.round(largura * escala)), altura: Math.max(1, Math.round(altura * escala)) }
}

/** "foto.PNG" → "foto.jpg" */
export function nomeJpg(nome: string): string {
  const base = nome.replace(/\.[^./\\]+$/, '')
  return `${base || 'imagem'}.jpg`
}

/**
 * Comprime a imagem se precisar. É "melhor esforço": se algo falhar, ou se o resultado não ficar
 * menor, devolve o arquivo original (o limite de tamanho continua valendo depois).
 */
export async function comprimirImagem(arquivo: File): Promise<File> {
  if (!ehComprimivel(arquivo.type) || typeof createImageBitmap !== 'function') return arquivo

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(arquivo)
    const info = { tipo: arquivo.type, bytes: arquivo.size, largura: bitmap.width, altura: bitmap.height }
    if (!precisaComprimir(info)) return arquivo

    const { largura, altura } = dimensoesReduzidas(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const ctx = canvas.getContext('2d')
    if (!ctx) return arquivo
    // JPEG não tem transparência: fundo branco no lugar do preto.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, largura, altura)
    ctx.drawImage(bitmap, 0, 0, largura, altura)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALIDADE_JPEG))
    if (!blob || blob.size >= arquivo.size) return arquivo
    return new File([blob], nomeJpg(arquivo.name), { type: 'image/jpeg', lastModified: arquivo.lastModified })
  } catch {
    return arquivo
  } finally {
    bitmap?.close()
  }
}
