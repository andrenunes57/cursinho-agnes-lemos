// Material do tipo "texto" (SPEC RF-11): texto simples com links clicáveis. Só http(s), e o
// texto vira nós React (sem dangerouslySetInnerHTML).

export type ParteTexto = { tipo: 'texto'; valor: string } | { tipo: 'link'; valor: string }

const URL_NO_TEXTO = /https?:\/\/[^\s<>"]+/gi
// Pontuação que normalmente fecha a frase, e não faz parte do link.
const PONTUACAO_FINAL = /[.,;:!?)\]}'"]+$/

export function partesComLinks(texto: string): ParteTexto[] {
  const partes: ParteTexto[] = []
  let cursor = 0
  for (const encontrado of texto.matchAll(URL_NO_TEXTO)) {
    const inicio = encontrado.index
    let url = encontrado[0]
    // Mantém ")" quando o link tem "(" (ex.: Wikipédia), senão a pontuação final fica de fora.
    const sobra = PONTUACAO_FINAL.exec(url)?.[0] ?? ''
    if (sobra.startsWith(')') && url.includes('(')) url = url.replace(/[.,;:!?\]}'"]+$/, '')
    else if (sobra) url = url.slice(0, url.length - sobra.length)
    if (inicio > cursor) partes.push({ tipo: 'texto', valor: texto.slice(cursor, inicio) })
    partes.push({ tipo: 'link', valor: url })
    cursor = inicio + url.length
  }
  if (cursor < texto.length) partes.push({ tipo: 'texto', valor: texto.slice(cursor) })
  return partes
}
