import { describe, expect, it } from 'vitest'
import { emAlerta, percentualUso, separarOrfaos, totaisPorFinalidade, type ArquivoArmazenado } from './armazenamento'

const agora = new Date('2026-11-14T12:00:00Z')

function arquivo(parcial: Partial<ArquivoArmazenado>): ArquivoArmazenado {
  return {
    id: 'x',
    nome: 'x.pdf',
    tamanho_bytes: 100,
    url_visualizacao: 'https://drive.google.com/file/d/x/view',
    finalidade: 'material',
    conta_armazenamento: 'drive-01',
    criado_em: '2026-11-10T12:00:00Z',
    materiais: [],
    entregas: [],
    ...parcial,
  }
}

describe('separarOrfaos (RF-25)', () => {
  it('só arquivos sem material e sem entrega, com mais de 24h, dos mais antigos aos mais novos', () => {
    const lista = [
      arquivo({ id: 'novo', criado_em: '2026-11-13T13:00:00Z' }), // 23h: ainda pode estar sendo ligado
      arquivo({ id: 'material', materiais: [{ id: 'm' }] }),
      arquivo({ id: 'entrega', finalidade: 'entrega', entregas: [{ id: 'e' }] }),
      arquivo({ id: 'orfao-2', criado_em: '2026-11-12T00:00:00Z' }),
      arquivo({ id: 'orfao-1', criado_em: '2026-11-01T00:00:00Z' }),
      arquivo({ id: 'limite', criado_em: '2026-11-13T11:59:59Z' }),
    ]
    expect(separarOrfaos(lista, agora).map((a) => a.id)).toEqual(['orfao-1', 'orfao-2', 'limite'])
  })
})

describe('totaisPorFinalidade', () => {
  it('soma quantidade e bytes', () => {
    const totais = totaisPorFinalidade([
      arquivo({ tamanho_bytes: 100 }),
      arquivo({ tamanho_bytes: 50 }),
      arquivo({ finalidade: 'entrega', tamanho_bytes: 7 }),
    ])
    expect(totais).toEqual({ material: { quantidade: 2, bytes: 150 }, entrega: { quantidade: 1, bytes: 7 } })
  })
})

describe('uso do Drive', () => {
  it('percentual com uma casa; alerta a partir de 80%', () => {
    expect(percentualUso(1, 3)).toBe(33.3)
    expect(percentualUso(0, 0)).toBeNull()
    expect(emAlerta(percentualUso(79.9, 100))).toBe(false)
    expect(emAlerta(percentualUso(80, 100))).toBe(true)
    expect(emAlerta(null)).toBe(false)
  })
})
