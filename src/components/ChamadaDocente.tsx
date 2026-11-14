import { useMutation, useQueryClient } from '@tanstack/react-query'
import { hojeSP, formatarDataHora } from '../lib/datas'
import { mensagemDeErro } from '../lib/erros'
import { supabase } from '../lib/supabase'
import { plural, type AoResultado } from '../pages/coordenacao/comum'
import type { Aula } from '../pages/consultasAulas'
import { invalidarChamada, usePresencasDaAula } from '../pages/consultasFrequencia'
import { useEstudantesDaTurma } from '../pages/consultasTarefas'
import { ChamadaLista, type ItemChamada } from './ChamadaLista'
import { Carregando } from './ui/Carregando'
import { EmptyState } from './ui/EmptyState'
import { ErroComRetry } from './ui/ErroComRetry'

type Props = {
  aula: Aula
  /** Só a pessoa docente da aula; a coordenação vê a chamada só para leitura (ADR-06). */
  podeEditar: boolean
  avisar: AoResultado
}

/** Aba Chamada de /docente/aulas/:id (RF-20/RF-21). */
export function ChamadaDocente({ aula, podeEditar, avisar }: Props) {
  const qc = useQueryClient()
  // A RPC também recusa aula futura; aqui só se evita mostrar um formulário que não vai salvar.
  const futura = aula.data > hojeSP()
  const estudantes = useEstudantesDaTurma(futura ? undefined : aula.turma_id)
  const presencas = usePresencasDaAula(futura ? undefined : aula.id)

  const salvar = useMutation({
    mutationFn: async (itens: ItemChamada[]) => {
      const { data, error } = await supabase.rpc('registrar_chamada', { p_aula_id: aula.id, p_itens: itens })
      if (error) throw error
      return data
    },
    onSuccess: async (qtd) => {
      await invalidarChamada(qc)
      avisar({ tipo: 'sucesso', texto: `Chamada salva: ${plural(qtd, 'estudante', 'estudantes')}.` })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro) }),
  })

  let conteudo
  if (futura) {
    conteudo = (
      <EmptyState titulo="A chamada abre no dia da aula">
        <p>Não é possível registrar presença de uma aula com data futura.</p>
      </EmptyState>
    )
  } else if (estudantes.isPending || presencas.isPending) {
    conteudo = <Carregando texto="Carregando a chamada…" />
  } else if (estudantes.isError || presencas.isError) {
    conteudo = (
      <ErroComRetry
        mensagem="Não foi possível carregar a chamada."
        onTentarDeNovo={() => {
          void estudantes.refetch()
          void presencas.refetch()
        }}
      />
    )
  } else if (estudantes.data.length === 0) {
    conteudo = (
      <EmptyState titulo="Nenhuma pessoa estudante na turma">
        <p>A chamada lista as pessoas estudantes ativas matriculadas na turma {aula.turma}. Fale com a coordenação.</p>
      </EmptyState>
    )
  } else if (!podeEditar && presencas.data.length === 0) {
    conteudo = (
      <EmptyState titulo="Chamada ainda não registrada">
        <p>Só a pessoa docente da aula faz a chamada.</p>
      </EmptyState>
    )
  } else {
    const inicial = new Map(presencas.data.map((p) => [p.estudante_id, p.status]))
    const ultima = presencas.data.reduce<string | null>((max, p) => (max === null || p.registrado_em > max ? p.registrado_em : max), null)
    conteudo = (
      <>
        <p className="text-texto-suave">
          {ultima
            ? `Chamada registrada. Última alteração: ${formatarDataHora(ultima)}.`
            : 'Chamada ainda não registrada. Todas as pessoas começam como presentes: marque quem faltou e salve.'}
        </p>
        <ChamadaLista
          estudantes={estudantes.data}
          inicial={inicial}
          podeEditar={podeEditar}
          enviando={salvar.isPending}
          onSalvar={(itens) => salvar.mutate(itens)}
        />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="sr-only">Chamada</h2>
      {conteudo}
    </div>
  )
}
