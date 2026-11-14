import { describe, expect, it } from 'vitest'
import {
  anoSP,
  ehDataISO,
  formatarDataLonga,
  formatarDiaMes,
  formatarHora,
  hojeSP,
  inicioDaSemana,
  intervaloDaSemana,
  somarDias,
} from './datas'

describe('hojeSP', () => {
  it('usa o fuso de São Paulo, não o UTC', () => {
    // 02:30 UTC de 16/11 ainda é 23:30 de 15/11 em São Paulo (UTC-3).
    expect(hojeSP(new Date('2026-11-16T02:30:00Z'))).toBe('2026-11-15')
    expect(hojeSP(new Date('2026-11-16T03:30:00Z'))).toBe('2026-11-16')
  })

  it('vira o ano em São Paulo', () => {
    expect(anoSP(new Date('2027-01-01T02:00:00Z'))).toBe(2026)
    expect(anoSP(new Date('2027-01-01T03:00:00Z'))).toBe(2027)
  })
})

describe('semana de segunda a domingo', () => {
  it('segunda-feira é o início da própria semana', () => {
    expect(inicioDaSemana('2026-11-16')).toBe('2026-11-16')
  })

  it('domingo pertence à semana que começou na segunda anterior', () => {
    expect(inicioDaSemana('2026-11-22')).toBe('2026-11-16')
  })

  it('atravessa meses e anos', () => {
    expect(inicioDaSemana('2027-01-01')).toBe('2026-12-28')
    expect(intervaloDaSemana('2026-11-18')).toEqual({ de: '2026-11-16', ate: '2026-11-22' })
  })

  it('soma e subtrai dias', () => {
    expect(somarDias('2026-11-30', 1)).toBe('2026-12-01')
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28')
    expect(somarDias('2026-11-16', -7)).toBe('2026-11-09')
  })
})

describe('ehDataISO', () => {
  it('aceita só datas válidas no formato YYYY-MM-DD', () => {
    expect(ehDataISO('2026-11-16')).toBe(true)
    expect(ehDataISO('2026-02-30')).toBe(false)
    expect(ehDataISO('16/11/2026')).toBe(false)
    expect(ehDataISO(null)).toBe(false)
  })
})

describe('formatação', () => {
  it('formata em pt-BR sem depender do fuso da máquina', () => {
    expect(formatarDiaMes('2026-11-16')).toBe('16/11')
    expect(formatarDataLonga('2026-11-16')).toBe('segunda-feira, 16 de novembro')
  })

  it('corta os segundos da hora', () => {
    expect(formatarHora('14:00:00')).toBe('14:00')
    expect(formatarHora(null)).toBeNull()
  })
})
