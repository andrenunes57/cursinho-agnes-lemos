import { describe, expect, it } from 'vitest'
import { formatarPercentual, resumoChamada } from './frequencia'

describe('formatarPercentual', () => {
  it('uma casa decimal com vírgula; nulo = sem chamada', () => {
    expect(formatarPercentual(33.3)).toBe('33,3%')
    expect(formatarPercentual(100)).toBe('100,0%')
    expect(formatarPercentual(0)).toBe('0,0%')
    expect(formatarPercentual(null)).toBe('Sem chamada')
  })
})

describe('resumoChamada', () => {
  it('conta cada situação', () => {
    expect(resumoChamada(['presente', 'ausente', 'presente', 'justificada'])).toEqual({ presente: 2, ausente: 1, justificada: 1 })
    expect(resumoChamada([])).toEqual({ presente: 0, ausente: 0, justificada: 0 })
  })
})
