// Converte erros do PostgREST/Postgres em mensagens pt-BR para a UI (SPEC §5.4).
// As RPCs e triggers já levantam mensagens em pt-BR (§9.1); aqui só repassamos essas e
// traduzimos os códigos genéricos.

type ErroBanco = { code?: string; message?: string }

const GENERICA = 'Não foi possível concluir. Confira sua conexão e tente de novo.'

function ehErroBanco(e: unknown): e is ErroBanco {
  return typeof e === 'object' && e !== null && ('code' in e || 'message' in e)
}

/**
 * @param duplicado mensagem para violação de UNIQUE (23505), ex.: "Já existe uma disciplina com esse nome."
 */
export function mensagemDeErro(erro: unknown, duplicado = 'Já existe um registro com esses dados.'): string {
  if (!ehErroBanco(erro)) return GENERICA
  const mensagem = erro.message ?? ''
  switch (erro.code) {
    case '23505':
      return duplicado
    case '42501':
      // As RPCs usam 42501 com mensagem pt-BR; o privilégio/RLS nega com texto em inglês.
      return /permission denied|row-level security/i.test(mensagem) || !mensagem
        ? 'Você não tem permissão para fazer isso.'
        : mensagem
    case '23503':
      return 'Este registro está em uso e não pode ser removido.'
    case '23514':
      // Trigger com mensagem própria (ex.: aulas_valida_professor) vs. CHECK do Postgres.
      return /violates check constraint/i.test(mensagem) || !mensagem
        ? 'Algum campo está fora do formato permitido.'
        : mensagem
    case 'P0001':
      return mensagem || GENERICA
    default:
      return GENERICA
  }
}
