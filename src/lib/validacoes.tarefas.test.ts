import { describe, expect, it } from 'vitest'
import { conceitosDoTexto, lerNota, validarConceitos, validarNota, validarTituloTarefa } from './validacoes'

describe('lerNota e validarNota (0 a 10, uma casa)', () => {
  it('aceita vírgula ou ponto e até uma casa decimal', () => {
    expect(lerNota('7,5')).toBe(7.5)
    expect(lerNota(' 10 ')).toBe(10)
    expect(lerNota('0')).toBe(0)
    expect(lerNota('9.9')).toBe(9.9)
  })

  it('recusa fora do intervalo, mais casas e texto', () => {
    for (const texto of ['', '10,5', '11', '-1', '7,25', 'dez', '7,']) expect(lerNota(texto)).toBeNull()
  })

  it('mensagens', () => {
    expect(validarNota('')).toBe('Informe a nota.')
    expect(validarNota('12')).toMatch(/de 0 a 10/)
    expect(validarNota('8,5')).toBeNull()
  })
})

describe('conceitos (um por linha)', () => {
  it('ignora linhas vazias e espaços', () => {
    expect(conceitosDoTexto(' Satisfatório \n\n Precisa revisar\n')).toEqual(['Satisfatório', 'Precisa revisar'])
  })

  it('exige pelo menos um, sem repetição e com tamanho limitado', () => {
    expect(validarConceitos('\n \n')).toMatch(/pelo menos um/)
    expect(validarConceitos('Bom\nbom')).toBe('Há conceitos repetidos.')
    expect(validarConceitos('x'.repeat(41))).toMatch(/40 caracteres/)
    expect(validarConceitos(Array.from({ length: 11 }, (_, i) => `C${i}`).join('\n'))).toMatch(/no máximo 10/)
    expect(validarConceitos('A\nB\nC')).toBeNull()
  })
})

describe('validarTituloTarefa', () => {
  it('2 a 120 caracteres', () => {
    expect(validarTituloTarefa(' ')).toBe('Informe o título da tarefa.')
    expect(validarTituloTarefa('A')).toMatch(/pelo menos 2/)
    expect(validarTituloTarefa('Lista 1')).toBeNull()
  })
})
