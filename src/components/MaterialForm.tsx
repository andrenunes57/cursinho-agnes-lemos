import { useRef, useState, type FormEvent } from 'react'
import { ACCEPT, DICA_TIPOS, MENSAGEM_VIDEO, formatarTamanho, mimeDoArquivo, validarArquivo, validarTipo } from '../lib/arquivos'
import { ehComprimivel } from '../lib/imagem'
import {
  TEXTO_MATERIAL_MAX,
  TITULO_MATERIAL_MAX,
  validarTituloMaterial,
  validarUrl,
} from '../lib/validacoes'
import { idDoYoutube } from '../lib/youtube'
import type { Enums } from '../types/database'
import { Button } from './ui/Button'
import { Field } from './ui/Field'
import { FileInput } from './ui/FileInput'
import { RadioGroup } from './ui/RadioGroup'
import { TextArea } from './ui/TextArea'

export type TipoMaterial = Enums<'tipo_material'>

export type DadosMaterial =
  | { tipo: 'arquivo'; titulo: string; arquivo: File }
  | { tipo: 'link' | 'video'; titulo: string; url: string }
  | { tipo: 'texto'; titulo: string; conteudo: string }

const OPCOES_TIPO = [
  { valor: 'arquivo', rotulo: 'Arquivo (PDF, imagem, documento)' },
  { valor: 'link', rotulo: 'Link' },
  { valor: 'video', rotulo: 'Vídeo do YouTube' },
  { valor: 'texto', rotulo: 'Texto' },
] as const satisfies readonly { valor: TipoMaterial; rotulo: string }[]

type Props = {
  maxBytes: number
  /** false quando a URL da API de Arquivos ainda não foi configurada (RF-26). */
  arquivosDisponiveis: boolean
  enviando: boolean
  /** Texto do botão durante o envio ("Enviando…" para arquivo). */
  onEnviar: (dados: DadosMaterial) => void
  onCancelar: () => void
}

function erroArquivo(arquivo: File | null, maxBytes: number, disponivel: boolean): string | null {
  if (!disponivel) return 'O envio de arquivos ainda não foi configurado. Fale com a coordenação.'
  if (!arquivo) return 'Escolha o arquivo.'
  // Imagens grandes são comprimidas antes do envio (RF-14); o limite é conferido depois.
  if (ehComprimivel(mimeDoArquivo(arquivo))) return validarTipo(arquivo)
  return validarArquivo(arquivo, maxBytes)
}

function erroVideo(url: string): string | null {
  const erro = validarUrl(url)
  if (erro) return erro === 'Informe o link.' ? 'Cole o link do vídeo no YouTube.' : erro
  return idDoYoutube(url) ? null : 'Use o link de um vídeo do YouTube (youtu.be/… ou youtube.com/watch?v=…).'
}

/** Novo material da aula (RF-11). Nasce como rascunho (RF-12). */
export function MaterialForm({ maxBytes, arquivosDisponiveis, enviando, onEnviar, onCancelar }: Props) {
  const [tipo, setTipo] = useState<TipoMaterial>('arquivo')
  const [titulo, setTitulo] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [tentou, setTentou] = useState(false)

  const refTitulo = useRef<HTMLInputElement>(null)
  const refArquivo = useRef<HTMLInputElement>(null)
  const refUrl = useRef<HTMLInputElement>(null)
  const refConteudo = useRef<HTMLTextAreaElement>(null)

  const erros = {
    titulo: validarTituloMaterial(titulo),
    arquivo: tipo === 'arquivo' ? erroArquivo(arquivo, maxBytes, arquivosDisponiveis) : null,
    url: tipo === 'link' ? validarUrl(url) : tipo === 'video' ? erroVideo(url) : null,
    conteudo:
      tipo !== 'texto'
        ? null
        : !conteudo.trim()
          ? 'Escreva o texto do material.'
          : conteudo.length > TEXTO_MATERIAL_MAX
            ? `Use no máximo ${TEXTO_MATERIAL_MAX} caracteres.`
            : null,
  }

  function escolherArquivo(novo: File | null) {
    setArquivo(novo)
    // Sugere o título a partir do nome do arquivo, sem a extensão.
    if (novo && !titulo.trim()) setTitulo(novo.name.replace(/\.[^.]+$/, '').slice(0, TITULO_MATERIAL_MAX))
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTentou(true)
    // Foco no primeiro campo com erro, na ordem visual (SPEC §5.3).
    if (erros.arquivo) return refArquivo.current?.focus()
    if (erros.url) return refUrl.current?.focus()
    if (erros.titulo) return refTitulo.current?.focus()
    if (erros.conteudo) return refConteudo.current?.focus()

    const t = titulo.trim()
    if (tipo === 'arquivo' && arquivo) onEnviar({ tipo, titulo: t, arquivo })
    else if (tipo === 'link' || tipo === 'video') onEnviar({ tipo, titulo: t, url: url.trim() })
    else if (tipo === 'texto') onEnviar({ tipo, titulo: t, conteudo: conteudo.trim() })
  }

  const erro = (campo: keyof typeof erros) => (tentou ? erros[campo] : null)

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      <RadioGroup
        legenda="Tipo de material"
        nome="tipo-material"
        opcoes={OPCOES_TIPO}
        valor={tipo}
        onChange={(novo) => {
          setTipo(novo)
          setTentou(false)
        }}
      />

      {tipo === 'arquivo' && (
        <FileInput
          ref={refArquivo}
          rotulo="Arquivo para enviar"
          obrigatorio
          accept={ACCEPT}
          dica={`${DICA_TIPOS}. Até ${formatarTamanho(maxBytes)}. Fotos grandes são reduzidas antes do envio. ${MENSAGEM_VIDEO}`}
          arquivo={arquivo}
          onChange={escolherArquivo}
          disabled={enviando}
          erro={erro('arquivo')}
        />
      )}
      {(tipo === 'link' || tipo === 'video') && (
        <Field
          ref={refUrl}
          rotulo={tipo === 'video' ? 'Link do vídeo no YouTube' : 'Endereço do link'}
          dica={tipo === 'video' ? 'Ex.: https://youtu.be/… — o vídeo aparece embutido na aula.' : 'Ex.: https://…'}
          obrigatorio
          type="url"
          inputMode="url"
          autoComplete="off"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          erro={erro('url')}
        />
      )}

      <Field
        ref={refTitulo}
        rotulo="Título do material"
        dica={`Ex.: Lista de exercícios 1. Até ${TITULO_MATERIAL_MAX} caracteres.`}
        obrigatorio
        autoComplete="off"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        erro={erro('titulo')}
      />

      {tipo === 'texto' && (
        <TextArea
          ref={refConteudo}
          rotulo="Conteúdo do texto"
          dica="Texto simples. Links começando com https:// ficam clicáveis."
          obrigatorio
          rows={6}
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          erro={erro('conteudo')}
        />
      )}

      <p className="text-sm text-texto-suave">O material é salvo como rascunho: só aparece para estudantes depois de publicado.</p>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" carregando={enviando} textoCarregando={tipo === 'arquivo' ? 'Enviando…' : 'Salvando…'}>
          Salvar rascunho
        </Button>
        <Button variante="discreto" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
