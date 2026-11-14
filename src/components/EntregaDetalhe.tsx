import { formatarTamanho } from '../lib/arquivos'
import { formatarDataHora } from '../lib/datas'
import { formatarNota } from '../lib/validacoes'
import { situacaoDaEntrega, type Entrega, type Tarefa } from '../pages/consultasTarefas'
import { LinkExterno, TextoComLinks } from './LinkExterno'

type Props = {
  entrega: Entrega
  tarefa: Pick<Tarefa, 'prazo' | 'tipo_avaliacao'>
}

/** Conteúdo de uma entrega (arquivo, link, comentário) e a avaliação, se houver (RF-16, RF-19). */
export function EntregaDetalhe({ entrega, tarefa }: Props) {
  const atrasada = situacaoDaEntrega({ enviada_em: entrega.enviada_em, avaliada_em: null }, tarefa.prazo) === 'atrasada'
  const arquivo = entrega.arquivos
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
        <dt className="font-semibold">Enviada em</dt>
        <dd>
          {formatarDataHora(entrega.enviada_em)}
          {atrasada && <span className="font-semibold text-erro"> (depois do prazo)</span>}
        </dd>
        {arquivo && (
          <>
            <dt className="font-semibold">Arquivo</dt>
            <dd className="min-w-0">
              <LinkExterno href={arquivo.url_visualizacao}>Abrir {arquivo.nome}</LinkExterno>{' '}
              <span className="text-sm text-texto-suave">({formatarTamanho(arquivo.tamanho_bytes)})</span>
            </dd>
          </>
        )}
        {entrega.link && (
          <>
            <dt className="font-semibold">Link</dt>
            <dd className="min-w-0">
              <LinkExterno href={entrega.link}>{entrega.link}</LinkExterno>
            </dd>
          </>
        )}
        {entrega.comentario && (
          <>
            <dt className="font-semibold">Comentário</dt>
            <dd className="min-w-0">
              <TextoComLinks texto={entrega.comentario} />
            </dd>
          </>
        )}
      </dl>

      {entrega.avaliada_em && (
        <section aria-label="Avaliação" className="flex flex-col gap-2 rounded-lg border-l-4 border-sucesso bg-sucesso-fundo px-4 py-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
            {tarefa.tipo_avaliacao === 'nota' && entrega.nota !== null && (
              <>
                <dt className="font-semibold">Nota</dt>
                <dd className="text-lg font-bold">{formatarNota(entrega.nota)}</dd>
              </>
            )}
            {tarefa.tipo_avaliacao === 'conceito' && entrega.conceito && (
              <>
                <dt className="font-semibold">Conceito</dt>
                <dd className="text-lg font-bold">{entrega.conceito}</dd>
              </>
            )}
            {entrega.devolutiva && (
              <>
                <dt className="font-semibold">Devolutiva</dt>
                <dd className="min-w-0">
                  <TextoComLinks texto={entrega.devolutiva} />
                </dd>
              </>
            )}
            <dt className="font-semibold">Avaliada em</dt>
            <dd>{formatarDataHora(entrega.avaliada_em)}</dd>
          </dl>
        </section>
      )}
    </div>
  )
}
