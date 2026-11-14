import { describe, expect, it } from 'vitest'
import { mensagemDeErro } from './erros'

describe('mensagemDeErro', () => {
  it('UNIQUE (23505) usa a mensagem de duplicado', () => {
    const erro = { code: '23505', message: 'duplicate key value violates unique constraint' }
    expect(mensagemDeErro(erro, 'Já existe uma disciplina com esse nome.')).toBe(
      'Já existe uma disciplina com esse nome.',
    )
  })

  it('42501 repassa a mensagem pt-BR da RPC e traduz a negação do Postgres', () => {
    expect(mensagemDeErro({ code: '42501', message: 'Somente a coordenação pode aprovar cadastros.' })).toBe(
      'Somente a coordenação pode aprovar cadastros.',
    )
    expect(mensagemDeErro({ code: '42501', message: 'new row violates row-level security policy' })).toBe(
      'Você não tem permissão para fazer isso.',
    )
  })

  it('P0001 (raise exception) repassa a mensagem', () => {
    const erro = { code: 'P0001', message: 'Não é possível deixar a coordenação sem nenhuma pessoa ativa.' }
    expect(mensagemDeErro(erro)).toBe('Não é possível deixar a coordenação sem nenhuma pessoa ativa.')
  })

  it('23514: trigger com mensagem própria vs. CHECK do Postgres', () => {
    const trigger = { code: '23514', message: 'A pessoa responsável pela aula precisa ser docente.' }
    expect(mensagemDeErro(trigger)).toBe('A pessoa responsável pela aula precisa ser docente.')
    const check = { code: '23514', message: 'new row for relation "aulas" violates check constraint "x"' }
    expect(mensagemDeErro(check)).toMatch(/fora do formato/)
  })

  it('qualquer outra coisa vira a mensagem genérica', () => {
    expect(mensagemDeErro(new TypeError('Failed to fetch'))).toMatch(/Confira sua conexão/)
    expect(mensagemDeErro(null)).toMatch(/Confira sua conexão/)
  })
})
