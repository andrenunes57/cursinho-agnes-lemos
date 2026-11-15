import type { ButtonHTMLAttributes, Ref } from 'react'

type Variante = 'primario' | 'secundario' | 'discreto' | 'perigo'

const estilos: Record<Variante, string> = {
  primario: 'bg-marca text-white hover:bg-marca-escura',
  secundario: 'border-2 border-marca bg-superficie text-marca hover:bg-marca-clara',
  discreto: 'text-marca underline underline-offset-4 hover:text-marca-escura',
  perigo: 'border-2 border-erro bg-superficie text-erro hover:bg-erro-fundo',
}

const classesBotao = (variante: Variante = 'primario') =>
  `inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-5 font-semibold disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-wait aria-disabled:opacity-60 ${estilos[variante]}`

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  /** Mostra o texto de carregando e bloqueia o botão (sem tirar o foco dele). */
  carregando?: boolean
  textoCarregando?: string
  ref?: Ref<HTMLButtonElement>
}

/**
 * Botão com alvo de toque ≥ 44×44 px (SPEC §5.3).
 *
 * Durante o `carregando`, o botão usa `aria-disabled` e ignora cliques e envios, em vez de
 * `disabled`: um botão `disabled` perde o foco, e quem usa teclado ou leitor de tela voltava
 * para o topo da página depois de cada "Salvar".
 */
export function Button({
  variante = 'primario',
  carregando = false,
  textoCarregando = 'Aguarde…',
  className = '',
  type = 'button',
  disabled,
  onClick,
  children,
  ...resto
}: Props) {
  return (
    <button
      type={type}
      className={`${classesBotao(variante)} ${className}`}
      disabled={disabled}
      aria-disabled={carregando || undefined}
      {...resto}
      // preventDefault no clique também cancela o envio do formulário (inclusive o envio
      // implícito pelo Enter num campo, que o navegador faz como um clique no botão submit).
      onClick={carregando ? (e) => e.preventDefault() : onClick}
    >
      {carregando ? textoCarregando : children}
    </button>
  )
}
