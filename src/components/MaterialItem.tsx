import { FileText, Link2, CirclePlay, StickyNote } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatarTamanho } from '../lib/arquivos'
import { idDoYoutube, urlEmbutida } from '../lib/youtube'
import type { Material } from '../pages/consultasAulas'
import type { Enums } from '../types/database'
import { LinkExterno, TextoComLinks } from './LinkExterno'

const ROTULO_TIPO: Record<Enums<'tipo_material'>, string> = {
  arquivo: 'Arquivo',
  link: 'Link',
  video: 'Vídeo',
  texto: 'Texto',
}

const ICONES = { arquivo: FileText, link: Link2, video: CirclePlay, texto: StickyNote }

function Conteudo({ material }: { material: Material }) {
  switch (material.tipo) {
    case 'arquivo': {
      const arquivo = material.arquivos
      if (!arquivo) return <p className="text-texto-suave">Arquivo indisponível.</p>
      return (
        <p className="flex flex-wrap items-baseline gap-x-2">
          <LinkExterno href={arquivo.url_visualizacao}>Abrir {arquivo.nome}</LinkExterno>
          <span className="text-sm text-texto-suave">({formatarTamanho(arquivo.tamanho_bytes)})</span>
        </p>
      )
    }
    case 'link':
      return material.url ? <LinkExterno href={material.url}>{material.url}</LinkExterno> : null
    case 'video': {
      const id = material.url ? idDoYoutube(material.url) : null
      if (!id) return material.url ? <LinkExterno href={material.url}>{material.url}</LinkExterno> : null
      return (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={urlEmbutida(id)}
            title={`Vídeo: ${material.titulo}`}
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )
    }
    case 'texto':
      return <TextoComLinks texto={material.conteudo ?? ''} />
  }
}

type Props = {
  material: Material
  /** Selos extras ao lado do tipo (ex.: Rascunho/Publicado na visão docente). */
  etiquetas?: ReactNode
  /** Ações da pessoa docente (publicar, ordenar, excluir). */
  acoes?: ReactNode
}

/** Um material da aula (RF-11): arquivo no Drive, link, vídeo do YouTube embutido ou texto. */
export function MaterialItem({ material, etiquetas, acoes }: Props) {
  const Icone = ICONES[material.tipo]
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="flex min-w-0 items-start gap-2 text-lg font-semibold">
          <Icone aria-hidden="true" className="mt-1 size-5 shrink-0 text-marca" />
          <span className="min-w-0 break-words">{material.titulo}</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          <span className="sr-only">Tipo:</span>
          <span className="text-sm font-medium text-texto-suave">{ROTULO_TIPO[material.tipo]}</span>
          {etiquetas}
        </div>
      </div>
      <Conteudo material={material} />
      {acoes}
    </article>
  )
}
