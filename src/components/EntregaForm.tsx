import { useRef, useState, type FormEvent } from 'react'
import { ACCEPT, DICA_TIPOS, MENSAGEM_VIDEO, formatarTamanho, mimeDoArquivo, validarArquivo, validarTipo } from '../lib/arquivos'
import { ehComprimivel } from '../lib/imagem'
import { COMENTARIO_MAX, ehUrlHttp, validarMaximo } from '../lib/validacoes'
import type { Entrega } from '../pages/consultasTarefas'
import { Button } from './ui/Button'
import { Field } from './ui/Field'
import { FileInput } from './ui/FileInput'
import { RadioGroup } from './ui/RadioGroup'
import { TextArea } from './ui/TextArea'

/** O que fazer com o arquivo: manter o já enviado, enviar um novo ou ficar sem arquivo. */
export type AcaoArquivo = { acao: 'manter' } | { acao: 'enviar'; arquivo: File } | { acao: 'nenhum' }

export type DadosEntrega = { arquivo: AcaoArquivo; link: string | null; comentario: string | null }

type EscolhaArquivo = 'manter' | 'trocar' | 'remover'

type Props = {
  /** Entrega já enviada (reenvio, RF-17), ou null no primeiro envio. */
  anterior: Entrega | null
  maxBytes: number
  /** false quando a URL da API de Arquivos ainda não foi configurada (RF-26). */
  arquivosDisponiveis: boolean
  enviando: boolean
  onEnviar: (dados: DadosEntrega) => void
}

const NADA = 'Envie pelo menos um: arquivo, link ou comentário.'

/** Envio e reenvio da entrega (RF-16, RF-17): arquivo e/ou link e/ou comentário. */
export function EntregaForm({ anterior, maxBytes, arquivosDisponiveis, enviando, onEnviar }: Props) {
  const arquivoAnterior = anterior?.arquivos ?? null
  const [escolha, setEscolha] = useState<EscolhaArquivo>(arquivoAnterior ? 'manter' : 'trocar')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [link, setLink] = useState(anterior?.link ?? '')
  const [comentario, setComentario] = useState(anterior?.comentario ?? '')
  const [tentou, setTentou] = useState(false)

  const refArquivo = useRef<HTMLInputElement>(null)
  const refLink = useRef<HTMLInputElement>(null)
  const refComentario = useRef<HTMLTextAreaElement>(null)

  const vaiEnviarArquivo = escolha === 'trocar' && arquivo !== null
  const temArquivo = (escolha === 'manter' && arquivoAnterior !== null) || vaiEnviarArquivo

  function erroDoArquivo(): string | null {
    if (escolha === 'trocar' && arquivoAnterior && !arquivo) return 'Escolha o novo arquivo.'
    if (!arquivo || escolha !== 'trocar') return null
    if (!arquivosDisponiveis) return 'O envio de arquivos ainda não foi configurado. Use um link ou fale com a coordenação.'
    // Imagens grandes são comprimidas antes do envio (RF-14); o limite é conferido depois.
    return ehComprimivel(mimeDoArquivo(arquivo)) ? validarTipo(arquivo) : validarArquivo(arquivo, maxBytes)
  }

  const erros = {
    arquivo: erroDoArquivo(),
    link: link.trim() && !ehUrlHttp(link) ? 'Use um link completo, começando com https://.' : null,
    comentario:
      validarMaximo(comentario, COMENTARIO_MAX) ?? (!temArquivo && !link.trim() && !comentario.trim() ? NADA : null),
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTentou(true)
    // Foco no primeiro campo com erro, na ordem visual (SPEC §5.3).
    if (erros.arquivo) return refArquivo.current?.focus()
    if (erros.link) return refLink.current?.focus()
    if (erros.comentario) return refComentario.current?.focus()

    const acao: AcaoArquivo = vaiEnviarArquivo
      ? { acao: 'enviar', arquivo: arquivo as File }
      : escolha === 'manter' && arquivoAnterior
        ? { acao: 'manter' }
        : { acao: 'nenhum' }
    onEnviar({ arquivo: acao, link: link.trim() || null, comentario: comentario.trim() || null })
  }

  const erro = (campo: keyof typeof erros) => (tentou ? erros[campo] : null)
  const dicaArquivo = `${DICA_TIPOS}. Até ${formatarTamanho(maxBytes)}. Fotos grandes são reduzidas antes do envio. ${MENSAGEM_VIDEO}`

  const seletor = (
    <FileInput
      ref={refArquivo}
      rotulo={arquivoAnterior ? 'Novo arquivo' : 'Arquivo'}
      obrigatorio={Boolean(arquivoAnterior)}
      accept={ACCEPT}
      dica={dicaArquivo}
      arquivo={arquivo}
      onChange={setArquivo}
      disabled={enviando}
      erro={erro('arquivo')}
    />
  )

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      <p className="text-sm text-texto-suave">Envie um arquivo, um link ou um comentário — ou mais de um.</p>

      {arquivoAnterior ? (
        <RadioGroup
          legenda="Arquivo"
          nome="arquivo-entrega"
          opcoes={[
            { valor: 'manter', rotulo: `Manter ${arquivoAnterior.nome}` },
            { valor: 'trocar', rotulo: 'Trocar por outro arquivo' },
            { valor: 'remover', rotulo: 'Remover o arquivo' },
          ]}
          valor={escolha}
          onChange={(nova) => {
            setEscolha(nova)
            if (nova !== 'trocar') setArquivo(null)
          }}
        >
          {escolha === 'trocar' && seletor}
        </RadioGroup>
      ) : (
        seletor
      )}

      <Field
        ref={refLink}
        rotulo="Link"
        dica="Opcional. Ex.: link de um documento do Google ou de um vídeo."
        type="url"
        inputMode="url"
        autoComplete="off"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        erro={erro('link')}
      />
      <TextArea
        ref={refComentario}
        rotulo="Comentário"
        dica={`Opcional. Até ${COMENTARIO_MAX} caracteres.`}
        rows={4}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        erro={erro('comentario')}
      />

      <div>
        <Button type="submit" carregando={enviando} textoCarregando="Enviando…">
          {anterior ? 'Reenviar entrega' : 'Enviar entrega'}
        </Button>
      </div>
    </form>
  )
}
