// Regras iguais às do CHECK `perfis_nome_social_tamanho` (SPEC §8.3). O banco continua sendo a
// barreira; aqui é só para dar a mensagem certa antes de enviar.

export const NOME_SOCIAL_MIN = 2
export const NOME_SOCIAL_MAX = 80

/** Mensagem de erro do nome social, ou null se estiver válido. */
export function validarNomeSocial(valor: string): string | null {
  const texto = valor.trim()
  if (!texto) return 'Informe seu nome social.'
  if (texto.length < NOME_SOCIAL_MIN) return `Use pelo menos ${NOME_SOCIAL_MIN} caracteres.`
  if (texto.length > NOME_SOCIAL_MAX) return `Use no máximo ${NOME_SOCIAL_MAX} caracteres.`
  return null
}

// Mesmo limite do CHECK `aulas_titulo_tamanho` (SPEC §8.3).
export const TITULO_AULA_MIN = 2
export const TITULO_AULA_MAX = 120
// Turmas e disciplinas não têm CHECK de tamanho no banco; o limite é só de UI.
export const NOME_CURTO_MIN = 2
export const NOME_CURTO_MAX = 60
export const ANO_MIN = 2000
export const ANO_MAX = 2100

function validarTexto(valor: string, min: number, max: number, vazio: string): string | null {
  const texto = valor.trim()
  if (!texto) return vazio
  if (texto.length < min) return `Use pelo menos ${min} caracteres.`
  if (texto.length > max) return `Use no máximo ${max} caracteres.`
  return null
}

export function validarTituloAula(valor: string): string | null {
  return validarTexto(valor, TITULO_AULA_MIN, TITULO_AULA_MAX, 'Informe o título da aula.')
}

export function validarNomeTurma(valor: string): string | null {
  return validarTexto(valor, NOME_CURTO_MIN, NOME_CURTO_MAX, 'Informe o nome da turma.')
}

export function validarNomeDisciplina(valor: string): string | null {
  return validarTexto(valor, NOME_CURTO_MIN, NOME_CURTO_MAX, 'Informe o nome da disciplina.')
}

export function validarAno(valor: string): string | null {
  const texto = valor.trim()
  if (!texto) return 'Informe o ano.'
  if (!/^\d{4}$/.test(texto)) return 'Use um ano com 4 dígitos, como 2027.'
  const ano = Number(texto)
  if (ano < ANO_MIN || ano > ANO_MAX) return `Use um ano entre ${ANO_MIN} e ${ANO_MAX}.`
  return null
}

/** Campo de seleção obrigatório (turma, disciplina, docente, data). */
export function validarObrigatorio(valor: string, mensagem: string): string | null {
  return valor.trim() ? null : mensagem
}
