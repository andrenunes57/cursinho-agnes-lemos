import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { LinkExterno, classeLink } from '../../components/LinkExterno'
import { Aviso } from '../../components/ui/Aviso'
import { Card } from '../../components/ui/Card'
import { Carregando } from '../../components/ui/Carregando'
import { Confirmacao } from '../../components/ui/Confirmacao'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { ErroArquivos, formatarTamanho, type Finalidade } from '../../lib/arquivos'
import { ALERTA_USO, emAlerta, percentualUso, separarOrfaos, totaisPorFinalidade, type ArquivoArmazenado } from '../../lib/armazenamento'
import { useApiArquivos } from '../../lib/configuracoes'
import { formatarDataHora } from '../../lib/datas'
import { mensagemDeErro } from '../../lib/erros'
import { supabase } from '../../lib/supabase'
import { plural, useResultado, type AoResultado } from './comum'

const chavesArmazenamento = {
  status: ['armazenamento', 'status'] as const,
  arquivos: ['armazenamento', 'arquivos'] as const,
}

const ROTULO_FINALIDADE: Record<Finalidade, string> = { material: 'Materiais', entrega: 'Entregas' }
const ROTULO_FINALIDADE_SINGULAR: Record<Finalidade, string> = { material: 'Material', entrega: 'Entrega' }

const mensagem = (erro: unknown) => (erro instanceof ErroArquivos ? erro.message : mensagemDeErro(erro))

/** Todos os arquivos, com as referências que os mantêm em uso (a coordenação lê tudo, §9.3). */
function useArquivos() {
  return useQuery({
    queryKey: chavesArmazenamento.arquivos,
    queryFn: async (): Promise<ArquivoArmazenado[]> => {
      const { data, error } = await supabase
        .from('arquivos')
        .select('id, nome, tamanho_bytes, url_visualizacao, finalidade, conta_armazenamento, criado_em, materiais(id), entregas(id)')
      if (error) throw error
      return data
    },
  })
}

function UsoDoDrive() {
  const api = useApiArquivos()
  const status = useQuery({
    queryKey: chavesArmazenamento.status,
    enabled: api.configurada,
    staleTime: 60_000,
    queryFn: () => api.status(),
  })

  let conteudo
  if (api.carregando) {
    conteudo = <Carregando texto="Carregando configurações…" />
  } else if (!api.configurada) {
    conteudo = (
      <p>
        A API de Arquivos ainda não foi configurada.{' '}
        <Link to="/coordenacao/configuracoes" className={classeLink}>
          Abrir as configurações
        </Link>
      </p>
    )
  } else if (status.isPending) {
    conteudo = <Carregando texto="Consultando o Google Drive…" />
  } else if (status.isError) {
    conteudo = <ErroComRetry mensagem={mensagem(status.error)} onTentarDeNovo={() => void status.refetch()} />
  } else {
    const { usadoBytes, limiteBytes, conta } = status.data
    const pct = percentualUso(usadoBytes, limiteBytes)
    const alerta = emAlerta(pct)
    conteudo = (
      <>
        <p>
          <span className="font-semibold">{formatarTamanho(usadoBytes)}</span>
          {pct === null ? ' usados' : ` de ${formatarTamanho(limiteBytes)} usados (${String(pct).replace('.', ',')}%)`} na conta{' '}
          <span className="font-semibold">{conta}</span>.
        </p>
        {pct !== null && (
          <div aria-hidden="true" className="h-4 w-full overflow-hidden rounded-full border border-borda-forte bg-fundo">
            <div className={`h-full ${alerta ? 'bg-erro' : 'bg-marca'}`} style={{ width: `${pct}%` }} />
          </div>
        )}
        {alerta && (
          <p className="rounded-lg border-l-4 border-erro bg-erro-fundo px-4 py-3 font-medium text-erro">
            Atenção: o Drive passou de {ALERTA_USO}% de uso. Esvazie a lixeira do Drive e exclua os arquivos órfãos abaixo. Se
            não bastar, siga o procedimento de Drive cheio (troca para uma conta nova).
          </p>
        )}
        <p className="text-sm text-texto-suave">
          O espaço é compartilhado com o Gmail e o Google Fotos da conta. Arquivos na lixeira continuam ocupando espaço até a
          lixeira ser esvaziada.
        </p>
      </>
    )
  }

  return (
    <Card>
      <section aria-labelledby="titulo-uso" className="flex flex-col gap-3">
        <h2 id="titulo-uso" className="text-xl font-semibold">
          Uso do Google Drive
        </h2>
        {conteudo}
      </section>
    </Card>
  )
}

function Orfao({ arquivo, podeExcluir, avisar }: { arquivo: ArquivoArmazenado; podeExcluir: boolean; avisar: AoResultado }) {
  const qc = useQueryClient()
  const api = useApiArquivos()
  const excluir = useMutation({
    mutationFn: () => api.excluir(arquivo.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['armazenamento'] })
      avisar({ tipo: 'sucesso', texto: `Arquivo ${arquivo.nome} enviado para a lixeira do Drive.` })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagem(erro) }),
  })

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie p-4">
      <LinkExterno href={arquivo.url_visualizacao}>{arquivo.nome}</LinkExterno>
      <p className="text-sm text-texto-suave">
        {ROTULO_FINALIDADE_SINGULAR[arquivo.finalidade]} · {formatarTamanho(arquivo.tamanho_bytes)} · enviado em{' '}
        {formatarDataHora(arquivo.criado_em)} · conta {arquivo.conta_armazenamento}
      </p>
      {podeExcluir && (
        <div>
          <Confirmacao
            rotulo="Excluir"
            rotuloAcessivel={`Excluir ${arquivo.nome}`}
            rotuloConfirmar="Confirmar exclusão"
            aviso="O arquivo vai para a lixeira do Drive e some do sistema."
            carregando={excluir.isPending}
            onConfirmar={() => excluir.mutate()}
          />
        </div>
      )}
    </li>
  )
}

function Arquivos({ avisar }: { avisar: AoResultado }) {
  const arquivos = useArquivos()
  const api = useApiArquivos()

  if (arquivos.isPending) return <Carregando texto="Carregando arquivos…" />
  if (arquivos.isError) {
    return <ErroComRetry mensagem="Não foi possível carregar os arquivos." onTentarDeNovo={() => void arquivos.refetch()} />
  }

  const totais = totaisPorFinalidade(arquivos.data)
  const orfaos = separarOrfaos(arquivos.data)

  return (
    <>
      <Card>
        <section aria-labelledby="titulo-totais" className="flex flex-col gap-3">
          <h2 id="titulo-totais" className="text-xl font-semibold">
            Arquivos por finalidade
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {(['material', 'entrega'] as const).map((f) => (
              <div key={f} className="contents">
                <dt className="font-semibold">{ROTULO_FINALIDADE[f]}</dt>
                <dd>
                  {plural(totais[f].quantidade, 'arquivo', 'arquivos')} · {formatarTamanho(totais[f].bytes)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </Card>

      <section aria-labelledby="titulo-orfaos" className="flex flex-col gap-3">
        <h2 id="titulo-orfaos" className="text-xl font-semibold">
          Arquivos órfãos
        </h2>
        <p className="text-texto-suave">
          Arquivos que nenhum material nem entrega usa mais (por exemplo, de aulas ou tarefas excluídas), enviados há mais de
          24 horas.
        </p>
        {!api.configurada && !api.carregando && orfaos.length > 0 && (
          <p>Para excluir, configure antes a API de Arquivos.</p>
        )}
        {orfaos.length === 0 ? (
          <EmptyState titulo="Nenhum arquivo órfão">
            <p>Todos os arquivos estão em uso.</p>
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Arquivos órfãos">
            {orfaos.map((a) => (
              <Orfao key={a.id} arquivo={a} podeExcluir={api.configurada} avisar={avisar} />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

/** /coordenacao/armazenamento — uso do Drive, totais por finalidade e órfãos (RF-25). */
export function Armazenamento() {
  const { resultado, avisar } = useResultado()
  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Armazenamento</h1>
      <Aviso tipo={resultado?.tipo}>{resultado?.texto}</Aviso>
      <UsoDoDrive />
      <Arquivos avisar={avisar} />
    </>
  )
}
