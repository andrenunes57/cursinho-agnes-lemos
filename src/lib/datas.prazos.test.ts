import { describe, expect, it } from 'vitest'
import { estaAtrasada, formatarDataHora, isoParaCampoPrazo, prazoEncerrado, prazoParaISO } from './datas'

describe('prazoParaISO / isoParaCampoPrazo (hora de São Paulo)', () => {
  it('converte a hora local de São Paulo (UTC-3) para UTC', () => {
    expect(prazoParaISO('2026-11-20T23:59')).toBe('2026-11-21T02:59:00.000Z')
    expect(prazoParaISO('2027-01-01T00:00')).toBe('2027-01-01T03:00:00.000Z')
  })

  it('faz o caminho de volta para o campo datetime-local', () => {
    expect(isoParaCampoPrazo('2026-11-21T02:59:00.000Z')).toBe('2026-11-20T23:59')
    expect(isoParaCampoPrazo(prazoParaISO('2026-03-05T08:30') as string)).toBe('2026-03-05T08:30')
  })

  it('recusa textos inválidos', () => {
    for (const texto of ['', '2026-11-20', '2026-02-30T10:00', '2026-11-20T24:00', '2026-11-20T10:60', 'amanhã']) {
      expect(prazoParaISO(texto)).toBeNull()
    }
  })

  it('formata data e hora por extenso em São Paulo', () => {
    expect(formatarDataHora('2026-11-21T02:59:00Z')).toBe('Sexta-feira, 20 de novembro, às 23:59')
  })
})

describe('estaAtrasada e prazoEncerrado (SPEC §8.3)', () => {
  const prazo = '2026-11-21T02:59:00Z'

  it('é atrasada só quando enviada depois do prazo', () => {
    expect(estaAtrasada('2026-11-21T02:58:59Z', prazo)).toBe(false)
    expect(estaAtrasada('2026-11-21T02:59:00Z', prazo)).toBe(false)
    expect(estaAtrasada('2026-11-21T03:00:00Z', prazo)).toBe(true)
  })

  it('sem prazo, nunca atrasa nem encerra', () => {
    expect(estaAtrasada('2030-01-01T00:00:00Z', null)).toBe(false)
    expect(prazoEncerrado(null, new Date('2030-01-01T00:00:00Z'))).toBe(false)
  })

  it('o prazo encerra depois do instante combinado', () => {
    expect(prazoEncerrado(prazo, new Date('2026-11-21T02:00:00Z'))).toBe(false)
    expect(prazoEncerrado(prazo, new Date('2026-11-21T03:00:00Z'))).toBe(true)
  })
})
