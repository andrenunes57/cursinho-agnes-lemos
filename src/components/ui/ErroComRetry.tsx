import { Button } from './Button'

type Props = { mensagem: string; onTentarDeNovo: () => void }

/** Estado de erro com "Tentar de novo" (SPEC §11, estados obrigatórios). */
export function ErroComRetry({ mensagem, onTentarDeNovo }: Props) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p className="font-medium text-erro">{mensagem}</p>
      <Button variante="secundario" onClick={onTentarDeNovo}>
        Tentar de novo
      </Button>
    </div>
  )
}
