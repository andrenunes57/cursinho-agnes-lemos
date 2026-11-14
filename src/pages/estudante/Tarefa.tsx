import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/contexto'
import { EntregaDetalhe } from '../../components/EntregaDetalhe'
import { EntregaForm, type DadosEntrega } from '../../components/EntregaForm'
import { classeLink } from '../../components/LinkExterno'
import { TarefaResumo } from '../../components/TarefaResumo'
import { Aviso } from '../../components/ui/Aviso'
import { Card } from '../../components/ui/Card'
import { Carregando } from '../../components/ui/Carregando'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { Etiqueta } from '../../components/ui/Etiqueta'
import { ErroArquivos } from '../../lib/arquivos'
import { useApiArquivos } from '../../lib/configuracoes'
import { formatarDiaMes } from '../../lib/datas'
import { mensagemDeErro } from '../../lib/erros'
import { supabase } from '../../lib/supabase'
import { useResultado } from '../coordenacao/comum'
import {
  ROTULO_SITUACAO,
  TOM_SITUACAO,
  invalidarTarefas,
  situacaoDaEntrega,
  useMinhaEntrega,
  useTarefa,
  type Entrega,
} from '../consultasTarefas'

const mensagem = (erro: unknown) => (erro instanceof ErroArquivos ? erro.message : mensagemDeErro(erro))

/** /tarefas/:id — instruções, situação, envio/reenvio e avaliação (RF-16 a RF-19). */
export function Tarefa() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const qc = useQueryClient()
  const api = useApiArquivos()
  const tarefa = useTarefa(id)
  const entrega = useMinhaEntrega(id, perfil?.id)
  const { resultado, avisar } = useResultado()

  const enviar = useMutation({
    mutationFn: async ({ dados, anterior }: { dados: DadosEntrega; anterior: Entrega | null }) => {
      const arquivoAnterior = anterior?.arquivo_id ?? null
      // §9.4/§10: primeiro o arquivo novo (o Apps Script grava em `arquivos`), depois a RPC.
      let arquivoId: string | null = null
      let novo: string | null = null
      if (dados.arquivo.acao === 'enviar') {
        novo = (await api.enviar(dados.arquivo.arquivo, 'entrega')).id
        arquivoId = novo
      } else if (dados.arquivo.acao === 'manter') {
        arquivoId = arquivoAnterior
      }

      const { error } = await supabase.rpc('enviar_entrega', {
        p_tarefa_id: id as string,
        p_arquivo_id: arquivoId ?? undefined,
        p_link: dados.link ?? undefined,
        p_comentario: dados.comentario ?? undefined,
      })
      if (error) {
        // Não deixa o arquivo recém-enviado órfão se a entrega não foi gravada.
        if (novo) await api.excluir(novo).catch(() => undefined)
        throw error
      }

      // O arquivo antigo deixou de ser usado: vai para a lixeira (RF-17).
      if (arquivoAnterior && arquivoAnterior !== arquivoId) {
        try {
          await api.excluir(arquivoAnterior)
        } catch {
          return false // vira órfão; a coordenação limpa em Armazenamento (RF-25)
        }
      }
      return true
    },
    onSuccess: async (arquivoAntigoRemovido, { anterior }) => {
      await invalidarTarefas(qc)
      const texto = anterior ? 'Entrega reenviada.' : 'Entrega enviada.'
      avisar({
        tipo: 'sucesso',
        texto: arquivoAntigoRemovido ? texto : `${texto} O arquivo anterior não pôde ser removido agora; a coordenação faz essa limpeza.`,
      })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagem(erro) }),
  })

  let conteudo
  if (tarefa.isPending || entrega.isPending) {
    conteudo = <Carregando texto="Carregando tarefa…" />
  } else if (tarefa.isError || entrega.isError) {
    conteudo = (
      <ErroComRetry
        mensagem="Não foi possível carregar a tarefa."
        onTentarDeNovo={() => {
          void tarefa.refetch()
          void entrega.refetch()
        }}
      />
    )
  } else if (!tarefa.data) {
    conteudo = (
      <EmptyState titulo="Tarefa não encontrada">
        <p>
          Ela pode ter sido excluída ou ainda não ter sido publicada.{' '}
          <Link to="/tarefas" className={classeLink}>
            Ver suas tarefas
          </Link>
        </p>
      </EmptyState>
    )
  } else {
    const t = tarefa.data
    const minha = entrega.data
    const situacao = situacaoDaEntrega(minha, t.prazo)
    conteudo = (
      <>
        <p className="flex flex-wrap items-center gap-2">
          <span className="sr-only">Situação:</span>
          <Etiqueta tom={TOM_SITUACAO[situacao]}>{ROTULO_SITUACAO[situacao]}</Etiqueta>
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="font-semibold">Aula</dt>
          <dd className="min-w-0 break-words">
            <Link to={`/aulas/${t.aulas.id}`} className={classeLink}>
              {t.aulas.disciplinas.nome} · {t.aulas.titulo} ({formatarDiaMes(t.aulas.data)})
            </Link>
          </dd>
        </dl>
        <TarefaResumo tarefa={t} />

        {minha && (
          <section aria-labelledby="titulo-minha-entrega" className="flex flex-col gap-3">
            <h2 id="titulo-minha-entrega" className="text-xl font-semibold">
              Sua entrega
            </h2>
            <Card>
              <EntregaDetalhe entrega={minha} tarefa={t} />
            </Card>
          </section>
        )}

        {minha?.avaliada_em ? (
          <p className="rounded-lg border-l-4 border-marca bg-marca-clara px-4 py-3">
            Esta entrega já foi avaliada e não pode mais ser reenviada.
          </p>
        ) : (
          <section aria-labelledby="titulo-envio" className="flex flex-col gap-3">
            <h2 id="titulo-envio" className="text-xl font-semibold">
              {minha ? 'Reenviar' : 'Enviar'}
            </h2>
            {minha && <p className="text-sm text-texto-suave">O reenvio substitui a entrega acima. Dá para reenviar até a avaliação.</p>}
            <Card>
              <EntregaForm
                // Recria o formulário quando a entrega muda (depois de enviar/reenviar).
                key={minha?.enviada_em ?? 'nova'}
                anterior={minha}
                maxBytes={api.maxBytes}
                arquivosDisponiveis={api.configurada}
                enviando={enviar.isPending}
                onEnviar={(dados) => enviar.mutate({ dados, anterior: minha })}
              />
            </Card>
          </section>
        )}
      </>
    )
  }

  return (
    <>
      <p>
        <Link to="/tarefas" className={classeLink}>
          <span aria-hidden="true">← </span>Tarefas
        </Link>
      </p>
      <h1 className="text-3xl font-bold break-words text-marca">{tarefa.data?.titulo ?? 'Tarefa'}</h1>
      <Aviso tipo={resultado?.tipo}>{resultado?.texto}</Aviso>
      {conteudo}
    </>
  )
}
