import { useId, type Ref } from 'react'
import { formatarTamanho } from '../../lib/arquivos'
import { MensagemErro } from './MensagemErro'

type Props = {
  rotulo: string
  dica?: string
  erro?: string | null
  obrigatorio?: boolean
  accept?: string
  arquivo: File | null
  onChange: (arquivo: File | null) => void
  disabled?: boolean
  ref?: Ref<HTMLInputElement>
}

/**
 * Seleção de arquivo com <label>, dica e erro ligados por aria-describedby (SPEC §5.3). No
 * Android, o seletor do sistema já oferece a câmera para tirar a foto na hora.
 */
export function FileInput({ rotulo, dica, erro, obrigatorio = false, accept, arquivo, onChange, disabled, ref }: Props) {
  const id = useId()
  const idDica = `${id}-dica`
  const idErro = `${id}-erro`
  const idEscolhido = `${id}-escolhido`
  const descritores = [dica ? idDica : null, arquivo ? idEscolhido : null, erro ? idErro : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {rotulo}
        {obrigatorio && <span aria-hidden="true"> *</span>}
        {obrigatorio && <span className="sr-only"> (obrigatório)</span>}
      </label>
      {dica && (
        <p id={idDica} className="text-sm text-texto-suave">
          {dica}
        </p>
      )}
      <input
        id={id}
        ref={ref}
        type="file"
        accept={accept}
        disabled={disabled}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores}
        aria-required={obrigatorio || undefined}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className={`min-h-11 w-full min-w-0 rounded-lg border-2 bg-superficie px-3 py-2 text-base file:mr-3 file:min-h-9 file:rounded-md file:border-0 file:bg-marca-clara file:px-3 file:font-semibold file:text-marca ${erro ? 'border-erro' : 'border-borda-forte'}`}
      />
      {arquivo && (
        <p id={idEscolhido} className="break-all text-sm text-texto-suave">
          Escolhido: {arquivo.name} ({formatarTamanho(arquivo.size)})
        </p>
      )}
      {erro && <MensagemErro id={idErro}>{erro}</MensagemErro>}
    </div>
  )
}
