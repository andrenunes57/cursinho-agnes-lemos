import { describe, expect, it } from 'vitest'
import { gerarCSV, paraNomeDeArquivo } from './csv'
import { CABECALHO_CSV_FREQUENCIA, linhasCsvFrequencia, type LinhaFrequencia } from './frequencia'

const BOM = '﻿'

describe('gerarCSV (RF-24)', () => {
  it('começa com BOM UTF-8, separa por ; e termina as linhas com CRLF', () => {
    expect(gerarCSV(['A', 'B'], [['1', '2']])).toBe(`${BOM}A;B\r\n1;2\r\n`)
  })

  it('mantém acentos e põe aspas quando a célula tem ;, aspas ou quebra de linha', () => {
    const csv = gerarCSV(['Nome'], [['Conceição'], ['a;b'], ['diz "oi"'], ['linha 1\nlinha 2']])
    expect(csv).toBe(`${BOM}Nome\r\nConceição\r\n"a;b"\r\n"diz ""oi"""\r\n"linha 1\nlinha 2"\r\n`)
  })

  it('números com vírgula decimal; nulo vira célula vazia', () => {
    expect(gerarCSV(['x', 'y', 'z'], [[33.3, 4, null]])).toBe(`${BOM}x;y;z\r\n33,3;4;\r\n`)
  })

  it('texto que parece fórmula não é executado pela planilha', () => {
    expect(gerarCSV(['Nome'], [['=HIPERLINK("x")'], ['+1'], ['@soma'], ['-2']])).toBe(
      `${BOM}Nome\r\n"'=HIPERLINK(""x"")"\r\n'+1\r\n'@soma\r\n'-2\r\n`,
    )
  })
})

describe('paraNomeDeArquivo', () => {
  it('tira acentos, espaços e símbolos', () => {
    expect(paraNomeDeArquivo('Turma 2027 — Ação')).toBe('turma-2027-acao')
  })
})

describe('CSV do relatório de frequência', () => {
  // Cálculo manual: 1 presença em 3 aulas com chamada = 33,333…% → 33,3 (RPC `frequencia`, §4.5).
  const linhas: LinhaFrequencia[] = [
    { estudante_id: 'a', nome_social: 'Ana Souza', aulas_com_chamada: 3, presentes: 1, ausentes: 1, justificadas: 1, percentual: 33.3 },
    { estudante_id: 'b', nome_social: 'Bê', aulas_com_chamada: 2, presentes: 0, ausentes: 2, justificadas: 0, percentual: 0 },
    { estudante_id: 'c', nome_social: 'Cauê Lima', aulas_com_chamada: 0, presentes: 0, ausentes: 0, justificadas: 0, percentual: null },
  ]

  it('tem as colunas do relatório, os pronomes e o % com uma casa e vírgula', () => {
    const csv = gerarCSV(CABECALHO_CSV_FREQUENCIA, linhasCsvFrequencia(linhas, new Map([['a', 'ela/dela'], ['b', null]])))
    expect(csv.split('\r\n')).toEqual([
      `${BOM}Estudante;Pronomes;Aulas com chamada;Presentes;Ausentes;Justificadas;Frequência (%)`,
      'Ana Souza;ela/dela;3;1;1;1;33,3',
      'Bê;;2;0;2;0;0,0',
      'Cauê Lima;;0;0;0;0;',
      '',
    ])
  })

  it('o % exportado bate com presentes ÷ aulas com chamada', () => {
    for (const l of linhas.filter((x) => x.aulas_com_chamada > 0)) {
      const manual = Math.round((1000 * l.presentes) / l.aulas_com_chamada) / 10
      expect(l.percentual).toBe(manual)
    }
  })
})
