export const MENSAGEM_ERRO_RETORNO = 'O login demorou demais ou foi cancelado. Tente de novo.'

/**
 * O retorno do OAuth pode trazer `error`/`error_description` na query ou no hash (RF-01),
 * por exemplo `bad_oauth_state` quando a pessoa demora demais na tela do Google.
 */
export function temErroDeRetorno(search: string, hash: string): boolean {
  const query = new URLSearchParams(search)
  const fragmento = new URLSearchParams(hash.replace(/^#/, ''))
  return [query, fragmento].some((p) => p.has('error') || p.has('error_description') || p.has('error_code'))
}
