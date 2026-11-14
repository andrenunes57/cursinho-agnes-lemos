// CSV para abrir certo no Excel e no Google Sheets em pt-BR (RF-24): separador `;`, BOM UTF-8,
// fim de linha CRLF e decimal com vírgula.

export type Celula = string | number | null | undefined

const BOM = '﻿'

/** Planilhas executam células que começam com estes caracteres como fórmula. */
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/

function celula(valor: Celula): string {
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'number') return String(valor).replace('.', ',')
  // Texto vindo de pessoas (ex.: nome social) nunca vira fórmula.
  const texto = INICIO_DE_FORMULA.test(valor) ? `'${valor}` : valor
  return /[";\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

/** Monta o CSV completo (com BOM) a partir do cabeçalho e das linhas. */
export function gerarCSV(cabecalho: readonly string[], linhas: readonly (readonly Celula[])[]): string {
  return BOM + [cabecalho, ...linhas].map((linha) => linha.map(celula).join(';')).join('\r\n') + '\r\n'
}

/** "Turma 2027 — Ação" → "turma-2027-acao" (para nomes de arquivo). */
export function paraNomeDeArquivo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Faz o navegador baixar o CSV com o nome dado. */
export function baixarCSV(nome: string, conteudo: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
