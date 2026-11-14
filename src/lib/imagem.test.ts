import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BYTES_SEM_COMPRIMIR, comprimirImagem, dimensoesReduzidas, nomeJpg, precisaComprimir } from './imagem'

describe('precisaComprimir', () => {
  const base = { tipo: 'image/jpeg', bytes: 100_000, largura: 800, altura: 600 }

  it('imagem pequena e leve não comprime', () => {
    expect(precisaComprimir(base)).toBe(false)
  })
  it('mais de 500 KB comprime', () => {
    expect(precisaComprimir({ ...base, bytes: BYTES_SEM_COMPRIMIR + 1 })).toBe(true)
    expect(precisaComprimir({ ...base, bytes: BYTES_SEM_COMPRIMIR })).toBe(false)
  })
  it('lado maior que 1600 px comprime (retrato ou paisagem)', () => {
    expect(precisaComprimir({ ...base, largura: 1601 })).toBe(true)
    expect(precisaComprimir({ ...base, altura: 4000, largura: 3000 })).toBe(true)
    expect(precisaComprimir({ ...base, largura: 1600, altura: 1600 })).toBe(false)
  })
  it('PNG e WebP comprimem; GIF e PDF nunca', () => {
    expect(precisaComprimir({ ...base, tipo: 'image/png', bytes: 2_000_000 })).toBe(true)
    expect(precisaComprimir({ ...base, tipo: 'image/webp', bytes: 2_000_000 })).toBe(true)
    expect(precisaComprimir({ ...base, tipo: 'image/gif', bytes: 2_000_000 })).toBe(false)
    expect(precisaComprimir({ ...base, tipo: 'application/pdf', bytes: 2_000_000 })).toBe(false)
  })
})

describe('dimensoesReduzidas e nomeJpg', () => {
  it('mantém a proporção com o lado maior em 1600', () => {
    expect(dimensoesReduzidas(4000, 3000)).toEqual({ largura: 1600, altura: 1200 })
    expect(dimensoesReduzidas(3000, 4000)).toEqual({ largura: 1200, altura: 1600 })
    expect(dimensoesReduzidas(800, 600)).toEqual({ largura: 800, altura: 600 })
  })
  it('troca a extensão por .jpg', () => {
    expect(nomeJpg('foto.PNG')).toBe('foto.jpg')
    expect(nomeJpg('IMG_2026.11.13.webp')).toBe('IMG_2026.11.13.jpg')
    expect(nomeJpg('sem-extensao')).toBe('sem-extensao.jpg')
  })
})

describe('comprimirImagem (canvas mockado)', () => {
  let tamanhoSaida: number
  const desenhar = vi.fn()

  beforeEach(() => {
    tamanhoSaida = 300_000
    desenhar.mockClear()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })),
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ({ fillRect: vi.fn(), drawImage: desenhar, fillStyle: '' }) as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb, tipo) {
      cb(new Blob([new Uint8Array(tamanhoSaida)], { type: tipo }))
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const foto = () => new File([new Uint8Array(3_000_000)], 'foto.png', { type: 'image/png' })

  it('reduz para 1600 px e devolve um JPEG menor', async () => {
    const saida = await comprimirImagem(foto())
    expect(desenhar).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200)
    expect(saida.type).toBe('image/jpeg')
    expect(saida.name).toBe('foto.jpg')
    expect(saida.size).toBe(300_000)
  })

  it('devolve o original se o resultado não ficar menor', async () => {
    tamanhoSaida = 3_500_000
    const original = foto()
    expect(await comprimirImagem(original)).toBe(original)
  })

  it('devolve o original se a leitura da imagem falhar', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => Promise.reject(new Error('formato'))))
    const original = foto()
    expect(await comprimirImagem(original)).toBe(original)
  })

  it('não mexe em PDF', async () => {
    const pdf = new File([new Uint8Array(3_000_000)], 'lista.pdf', { type: 'application/pdf' })
    expect(await comprimirImagem(pdf)).toBe(pdf)
    expect(createImageBitmap).not.toHaveBeenCalled()
  })
})
