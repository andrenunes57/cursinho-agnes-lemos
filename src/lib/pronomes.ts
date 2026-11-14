// Opções de pronomes da SPEC §5.4. O valor gravado em `perfis.pronomes` é o texto exibido
// ("ela/dela", …), o texto livre de "outro" ou null ("prefiro não informar").

export const LIMITE_PRONOMES = 30

export const OPCOES_PRONOMES = [
  { valor: 'ela/dela', rotulo: 'ela/dela' },
  { valor: 'ele/dele', rotulo: 'ele/dele' },
  { valor: 'elu/delu', rotulo: 'elu/delu' },
  { valor: 'outro', rotulo: 'Outro' },
  { valor: 'nao-informar', rotulo: 'Prefiro não informar' },
] as const

export type OpcaoPronomes = (typeof OPCOES_PRONOMES)[number]['valor']

const PRONOMES_FIXOS: readonly string[] = ['ela/dela', 'ele/dele', 'elu/delu']

/** Converte a escolha do formulário no valor de `perfis.pronomes`. */
export function pronomesParaBanco(opcao: OpcaoPronomes, outro: string): string | null {
  if (opcao === 'nao-informar') return null
  if (opcao === 'outro') return outro.trim() || null
  return opcao
}

/** Faz o caminho inverso, para preencher o formulário de /perfil. */
export function pronomesDoBanco(valor: string | null): { opcao: OpcaoPronomes; outro: string } {
  if (!valor) return { opcao: 'nao-informar', outro: '' }
  if (PRONOMES_FIXOS.includes(valor)) return { opcao: valor as OpcaoPronomes, outro: '' }
  return { opcao: 'outro', outro: valor }
}

/** Mensagem de erro do campo "outro", ou null se estiver válido. */
export function validarPronomeOutro(opcao: OpcaoPronomes, outro: string): string | null {
  if (opcao !== 'outro') return null
  const texto = outro.trim()
  if (!texto) return 'Escreva seus pronomes ou escolha outra opção.'
  if (texto.length > LIMITE_PRONOMES) return `Use no máximo ${LIMITE_PRONOMES} caracteres.`
  return null
}
