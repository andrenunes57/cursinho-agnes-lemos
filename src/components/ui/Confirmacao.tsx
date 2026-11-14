import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'

type Props = {
  /** Texto do botão inicial (ex.: "Excluir"). */
  rotulo: string
  /** Nome acessível do botão inicial, quando o rótulo sozinho é ambíguo numa lista. */
  rotuloAcessivel?: string
  /** Texto do botão que confirma (ex.: "Confirmar exclusão"). */
  rotuloConfirmar: string
  /** Consequência da ação, mostrada antes de confirmar. */
  aviso: string
  carregando?: boolean
  onConfirmar: () => void
}

/**
 * Confirmação inline, sem diálogo nativo (SPEC §5.3): o botão vira um aviso com "Confirmar" e
 * "Cancelar". O foco vai para "Confirmar" ao abrir e volta ao botão inicial ao cancelar.
 */
export function Confirmacao({ rotulo, rotuloAcessivel, rotuloConfirmar, aviso, carregando = false, onConfirmar }: Props) {
  const [aberta, setAberta] = useState(false)
  const refConfirmar = useRef<HTMLButtonElement>(null)
  const refInicial = useRef<HTMLButtonElement>(null)
  const voltarFoco = useRef(false)

  useEffect(() => {
    if (aberta) refConfirmar.current?.focus()
    else if (voltarFoco.current) {
      voltarFoco.current = false
      refInicial.current?.focus()
    }
  }, [aberta])

  if (!aberta) {
    return (
      <Button ref={refInicial} variante="perigo" aria-label={rotuloAcessivel} onClick={() => setAberta(true)}>
        {rotulo}
      </Button>
    )
  }

  return (
    <div role="group" aria-label={rotuloAcessivel ?? rotulo} className="flex w-full flex-col gap-2 rounded-lg border-2 border-erro bg-erro-fundo p-3">
      <p className="font-medium text-erro">{aviso}</p>
      <div className="flex flex-wrap gap-2">
        <Button ref={refConfirmar} variante="perigo" carregando={carregando} textoCarregando="Aguarde…" onClick={onConfirmar}>
          {rotuloConfirmar}
        </Button>
        <Button
          variante="discreto"
          disabled={carregando}
          onClick={() => {
            voltarFoco.current = true
            setAberta(false)
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
