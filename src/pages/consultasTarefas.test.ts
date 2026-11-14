import { describe, expect, it, vi } from 'vitest'
import { porPrazo, situacaoDaEntrega } from './consultasTarefas'

// consultasTarefas importa o cliente, que exige as variáveis do build (ausentes no CI).
vi.mock('../lib/supabase', () => ({ supabase: {} }))

describe('situacaoDaEntrega (SPEC §8.3)', () => {
  const prazo = '2026-11-21T02:59:00Z'

  it('sem linha = pendente', () => {
    expect(situacaoDaEntrega(null, prazo)).toBe('pendente')
    expect(situacaoDaEntrega(undefined, null)).toBe('pendente')
  })

  it('com linha e sem avaliação = enviada ou atrasada', () => {
    expect(situacaoDaEntrega({ enviada_em: '2026-11-20T10:00:00Z', avaliada_em: null }, prazo)).toBe('enviada')
    expect(situacaoDaEntrega({ enviada_em: '2026-11-22T10:00:00Z', avaliada_em: null }, prazo)).toBe('atrasada')
    expect(situacaoDaEntrega({ enviada_em: '2026-11-22T10:00:00Z', avaliada_em: null }, null)).toBe('enviada')
  })

  it('avaliada vence o atraso', () => {
    expect(situacaoDaEntrega({ enviada_em: '2026-11-22T10:00:00Z', avaliada_em: '2026-11-23T10:00:00Z' }, prazo)).toBe('avaliada')
  })
})

describe('porPrazo', () => {
  it('prazo mais próximo primeiro; sem prazo no fim', () => {
    const lista = [{ prazo: null }, { prazo: '2026-12-01T00:00:00Z' }, { prazo: '2026-11-20T00:00:00Z' }]
    expect(lista.sort(porPrazo).map((t) => t.prazo)).toEqual(['2026-11-20T00:00:00Z', '2026-12-01T00:00:00Z', null])
  })
})
