import { describe, expect, it } from 'vitest'
import { itensDoMenu } from './menu'

const rotas = (...args: Parameters<typeof itensDoMenu>) => itensDoMenu(...args).map((i) => i.rota)

describe('itensDoMenu', () => {
  it('estudante vê aulas, tarefas e frequência das suas turmas', () => {
    expect(rotas('estudante', false)).toEqual(['/', '/aulas', '/tarefas', '/frequencia'])
  })

  it('docente vê as próprias aulas e a frequência delas', () => {
    expect(rotas('professor', false)).toEqual(['/', '/docente/aulas', '/docente/frequencia'])
  })

  it('coordenação vê as telas de gestão e não vê "Minhas aulas" se não der aula', () => {
    const itens = rotas('coordenacao', false)
    expect(itens).toEqual([
      '/',
      '/coordenacao/pessoas',
      '/coordenacao/aulas',
      '/coordenacao/frequencia',
      '/coordenacao/turmas',
      '/coordenacao/disciplinas',
      '/coordenacao/armazenamento',
      '/coordenacao/configuracoes',
    ])
    expect(itens).not.toContain('/docente/aulas')
  })

  it('coordenação que dá aula vê também "Minhas aulas"', () => {
    expect(rotas('coordenacao', true)).toContain('/docente/aulas')
  })

  it('ninguém além da coordenação vê as telas de gestão', () => {
    for (const papel of ['estudante', 'professor'] as const) {
      expect(rotas(papel, true).some((r) => r.startsWith('/coordenacao'))).toBe(false)
    }
  })
})
