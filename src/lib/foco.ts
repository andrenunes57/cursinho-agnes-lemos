// Gestão de foco para quem usa teclado ou leitor de tela (SPEC §5.3).
//
// O React remove do DOM o elemento focado em vários fluxos: o botão "Nova tarefa" vira o
// formulário, o formulário some depois de salvar, o item excluído sai da lista. Nesses casos o
// navegador põe o foco no <body> e a pessoa volta para o topo da página. Este módulo:
// - lembra o último elemento focado;
// - quando ele sai do DOM e o foco fica no <body>, devolve o foco a um lugar com sentido: o
//   gatilho registrado por quem fechou um formulário (`registrarRetorno`) ou o <h1> do conteúdo.

/** Como reencontrar um botão ou link depois que o React o recria. */
export type DescricaoGatilho = { tag: string; rotulo: string | null; texto: string }

const SELETOR_CAMPO =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'

let ultimoFocado: HTMLElement | null = null
let retornoPendente: { gatilho: DescricaoGatilho; em: number } | null = null
/** Um retorno registrado só vale para a perda de foco logo em seguida. */
const VALIDADE_RETORNO_MS = 1000

export function descrever(el: Element | null): DescricaoGatilho | null {
  if (!(el instanceof HTMLElement) || !['BUTTON', 'A'].includes(el.tagName)) return null
  return { tag: el.tagName, rotulo: el.getAttribute('aria-label'), texto: (el.textContent ?? '').trim() }
}

export function encontrar(d: DescricaoGatilho): HTMLElement | null {
  const candidatos = document.querySelectorAll<HTMLElement>(`main ${d.tag.toLowerCase()}`)
  return (
    [...candidatos].find((el) => el.getAttribute('aria-label') === d.rotulo && (el.textContent ?? '').trim() === d.texto) ?? null
  )
}

/** O gatilho que abriu o formulário (o último elemento focado, já fora do DOM). */
export function gatilhoAtual(): DescricaoGatilho | null {
  return ultimoFocado && !ultimoFocado.isConnected ? descrever(ultimoFocado) : null
}

/** Pede que, se o foco se perder em seguida, ele volte para este gatilho. */
export function registrarRetorno(d: DescricaoGatilho | null) {
  retornoPendente = d ? { gatilho: d, em: Date.now() } : null
}

export function primeiroCampo(raiz: HTMLElement | null): HTMLElement | null {
  return raiz?.querySelector<HTMLElement>(SELETOR_CAMPO) ?? null
}

function focar(el: HTMLElement) {
  if (!el.hasAttribute('tabindex') && !el.matches('a[href], button, input, select, textarea')) el.setAttribute('tabindex', '-1')
  el.focus()
}

function focoPerdido() {
  const ativo = document.activeElement
  return (!ativo || ativo === document.body) && !!ultimoFocado && !ultimoFocado.isConnected
}

function resgatar() {
  if (!focoPerdido()) {
    retornoPendente = null
    return
  }
  const valido = retornoPendente && Date.now() - retornoPendente.em <= VALIDADE_RETORNO_MS
  const gatilho = valido ? encontrar(retornoPendente!.gatilho) : null
  retornoPendente = null
  const alvo = gatilho ?? document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('main')
  if (alvo) focar(alvo)
}

/** Liga o resgate de foco no documento. Devolve a função que desliga. */
export function iniciarResgateDeFoco(): () => void {
  const aoFocar = (e: FocusEvent) => {
    if (e.target instanceof HTMLElement && e.target !== document.body) ultimoFocado = e.target
  }
  let quadro = 0
  const observador = new MutationObserver(() => {
    if (!focoPerdido()) return
    cancelAnimationFrame(quadro)
    // Espera o React terminar o commit (e o FocarAoAbrir focar o formulário novo, se houver).
    quadro = requestAnimationFrame(resgatar)
  })
  document.addEventListener('focusin', aoFocar)
  observador.observe(document.body, { childList: true, subtree: true })
  return () => {
    document.removeEventListener('focusin', aoFocar)
    observador.disconnect()
    cancelAnimationFrame(quadro)
    ultimoFocado = null
    retornoPendente = null
  }
}
