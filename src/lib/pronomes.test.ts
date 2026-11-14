import { describe, expect, it } from 'vitest'
import { pronomesDoBanco, pronomesParaBanco, validarPronomeOutro } from './pronomes'

describe('pronomes', () => {
  it('grava as opções fixas como texto', () => {
    expect(pronomesParaBanco('ela/dela', '')).toBe('ela/dela')
    expect(pronomesParaBanco('elu/delu', 'ignorado')).toBe('elu/delu')
  })

  it('"prefiro não informar" vira null', () => {
    expect(pronomesParaBanco('nao-informar', 'qualquer')).toBeNull()
  })

  it('"outro" usa o texto livre sem espaços nas pontas', () => {
    expect(pronomesParaBanco('outro', '  ile/dile ')).toBe('ile/dile')
  })

  it('reconstrói a opção a partir do banco', () => {
    expect(pronomesDoBanco(null)).toEqual({ opcao: 'nao-informar', outro: '' })
    expect(pronomesDoBanco('ele/dele')).toEqual({ opcao: 'ele/dele', outro: '' })
    expect(pronomesDoBanco('ile/dile')).toEqual({ opcao: 'outro', outro: 'ile/dile' })
  })

  it('valida o campo "outro": obrigatório e até 30 caracteres', () => {
    expect(validarPronomeOutro('ela/dela', '')).toBeNull()
    expect(validarPronomeOutro('outro', '   ')).toMatch(/Escreva/)
    expect(validarPronomeOutro('outro', 'a'.repeat(30))).toBeNull()
    expect(validarPronomeOutro('outro', 'a'.repeat(31))).toMatch(/30/)
  })
})
