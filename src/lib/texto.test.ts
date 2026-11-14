import { describe, expect, it } from 'vitest'
import { partesComLinks } from './texto'

describe('partesComLinks', () => {
  it('texto sem link fica inteiro', () => {
    expect(partesComLinks('Leiam o capítulo 3.')).toEqual([{ tipo: 'texto', valor: 'Leiam o capítulo 3.' }])
  })

  it('separa links http e https no meio do texto', () => {
    expect(partesComLinks('Veja https://exemplo.org/a?b=1 e http://x.com.')).toEqual([
      { tipo: 'texto', valor: 'Veja ' },
      { tipo: 'link', valor: 'https://exemplo.org/a?b=1' },
      { tipo: 'texto', valor: ' e ' },
      { tipo: 'link', valor: 'http://x.com' },
      { tipo: 'texto', valor: '.' },
    ])
  })

  it('não inclui a pontuação final nem o parêntese de fora', () => {
    expect(partesComLinks('(fonte: https://exemplo.org/texto).')).toEqual([
      { tipo: 'texto', valor: '(fonte: ' },
      { tipo: 'link', valor: 'https://exemplo.org/texto' },
      { tipo: 'texto', valor: ').' },
    ])
  })

  it('mantém o parêntese que faz parte do link', () => {
    expect(partesComLinks('https://pt.wikipedia.org/wiki/Função_(matemática)')).toEqual([
      { tipo: 'link', valor: 'https://pt.wikipedia.org/wiki/Função_(matemática)' },
    ])
    expect(partesComLinks('Leia https://pt.wikipedia.org/wiki/Função_(matemática).')).toEqual([
      { tipo: 'texto', valor: 'Leia ' },
      { tipo: 'link', valor: 'https://pt.wikipedia.org/wiki/Função_(matemática)' },
      { tipo: 'texto', valor: '.' },
    ])
  })

  it('ignora esquemas que não são http(s)', () => {
    expect(partesComLinks('javascript:alert(1) ftp://x.com')).toEqual([
      { tipo: 'texto', valor: 'javascript:alert(1) ftp://x.com' },
    ])
  })

  it('preserva quebras de linha', () => {
    expect(partesComLinks('Linha 1\nhttps://a.com\nLinha 3')).toEqual([
      { tipo: 'texto', valor: 'Linha 1\n' },
      { tipo: 'link', valor: 'https://a.com' },
      { tipo: 'texto', valor: '\nLinha 3' },
    ])
  })
})
