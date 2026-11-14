import { describe, expect, it } from 'vitest'
import { validarNomeSocial } from './validacoes'

describe('validarNomeSocial', () => {
  it('é obrigatório', () => {
    expect(validarNomeSocial('')).toMatch(/Informe/)
    expect(validarNomeSocial('   ')).toMatch(/Informe/)
  })

  it('aceita de 2 a 80 caracteres, ignorando espaços nas pontas', () => {
    expect(validarNomeSocial(' A ')).toMatch(/pelo menos 2/)
    expect(validarNomeSocial('Jo')).toBeNull()
    expect(validarNomeSocial('a'.repeat(80))).toBeNull()
    expect(validarNomeSocial('a'.repeat(81))).toMatch(/no máximo 80/)
  })
})
