import { describe, expect, it } from 'vitest'
import {
  validarAno,
  validarNomeDisciplina,
  validarNomeSocial,
  validarNomeTurma,
  validarObrigatorio,
  validarTituloAula,
} from './validacoes'

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

describe('validarTituloAula (CHECK de 2 a 120)', () => {
  it('é obrigatório e respeita os limites', () => {
    expect(validarTituloAula('  ')).toMatch(/Informe o título/)
    expect(validarTituloAula('A')).toMatch(/pelo menos 2/)
    expect(validarTituloAula(' Funções ')).toBeNull()
    expect(validarTituloAula('a'.repeat(120))).toBeNull()
    expect(validarTituloAula('a'.repeat(121))).toMatch(/no máximo 120/)
  })
})

describe('validarNomeTurma e validarNomeDisciplina', () => {
  it('exigem de 2 a 60 caracteres', () => {
    expect(validarNomeTurma('')).toMatch(/nome da turma/)
    expect(validarNomeDisciplina('')).toMatch(/nome da disciplina/)
    expect(validarNomeTurma('Turma 2027')).toBeNull()
    expect(validarNomeDisciplina('a'.repeat(61))).toMatch(/no máximo 60/)
  })
})

describe('validarAno', () => {
  it('aceita só anos de 4 dígitos numa faixa razoável', () => {
    expect(validarAno('')).toMatch(/Informe o ano/)
    expect(validarAno('27')).toMatch(/4 dígitos/)
    expect(validarAno('1999')).toMatch(/entre 2000 e 2100/)
    expect(validarAno('2027')).toBeNull()
  })
})

describe('validarObrigatorio', () => {
  it('devolve a mensagem quando vazio', () => {
    expect(validarObrigatorio('', 'Escolha a turma.')).toBe('Escolha a turma.')
    expect(validarObrigatorio('abc', 'Escolha a turma.')).toBeNull()
  })
})
