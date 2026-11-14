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
