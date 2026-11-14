import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../auth/contexto'
import { AulaForm, type DadosAula } from '../../components/AulaForm'
import { ListaAulas } from '../../components/ListaAulas'
import { Aviso } from '../../components/ui/Aviso'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Carregando } from '../../components/ui/Carregando'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { hojeSP } from '../../lib/datas'
import { mensagemDeErro } from '../../lib/erros'
import { supabase } from '../../lib/supabase'
import { useResultadoComAvisoDaNavegacao } from '../coordenacao/comum'
import { invalidarAulas, useDisciplinas, useTurmas } from '../coordenacao/consultas'
import { useAulas } from '../consultasAulas'

/** /docente/aulas — minhas aulas (próximas e passadas) + "Nova aula" (RF-10). */
export function MinhasAulas() {
  const { perfil } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { resultado, avisar } = useResultadoComAvisoDaNavegacao()
  const [criando, setCriando] = useState(false)

  const aulas = useAulas('minhas', perfil?.id)
  const turmas = useTurmas()
  const disciplinas = useDisciplinas()
  const hoje = hojeSP()

  const criar = useMutation({
    mutationFn: async (d: DadosAula) => {
      const { data, error } = await supabase
        .from('aulas')
        .insert({ ...d, professor_id: perfil?.id as string })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSuccess: async (id, d) => {
      await invalidarAulas(qc)
      // Vai direto para a aula, onde a docente adiciona os materiais.
      void navigate(`/docente/aulas/${id}`, { state: { aviso: `Aula ${d.titulo} criada.` } })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro) }),
  })

  const carregando = aulas.isPending || turmas.isPending || disciplinas.isPending
  const erro = aulas.isError || turmas.isError || disciplinas.isError

  let conteudo
  if (carregando) {
    conteudo = <Carregando texto="Carregando suas aulas…" />
  } else if (erro) {
    conteudo = (
      <ErroComRetry
        mensagem="Não foi possível carregar suas aulas."
        onTentarDeNovo={() => {
          void aulas.refetch()
          void turmas.refetch()
          void disciplinas.refetch()
        }}
      />
    )
  } else {
    // RF-10: a docente cria aula só em turma ativa, com ela mesma como responsável.
    const opcoesTurma = turmas.data.filter((t) => t.ativa).map((t) => ({ valor: t.id, rotulo: `${t.nome} (${t.ano})` }))
    const opcoesDisciplina = disciplinas.data.filter((d) => d.ativa).map((d) => ({ valor: d.id, rotulo: d.nome }))

    conteudo = (
      <>
        {criando ? (
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Nova aula</h2>
            {opcoesTurma.length === 0 ? (
              <EmptyState titulo="Nenhuma turma ativa">
                <p>Peça à coordenação para cadastrar ou reativar uma turma.</p>
              </EmptyState>
            ) : (
              <AulaForm
                inicial={{ professor_id: perfil?.id, data: hoje, turma_id: opcoesTurma.length === 1 ? opcoesTurma[0].valor : '' }}
                turmas={opcoesTurma}
                disciplinas={opcoesDisciplina}
                enviando={criar.isPending}
                textoBotao="Criar aula"
                onEnviar={(d) => criar.mutate(d)}
                onCancelar={() => setCriando(false)}
              />
            )}
          </Card>
        ) : (
          <Button className="self-start" onClick={() => setCriando(true)}>
            Nova aula
          </Button>
        )}
        <ListaAulas
          aulas={aulas.data}
          hoje={hoje}
          para={(a) => `/docente/aulas/${a.id}`}
          mostrarTurma
          semProximas="Use “Nova aula” para cadastrar a próxima. A coordenação também pode marcar aulas para você no cronograma."
        />
      </>
    )
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Minhas aulas</h1>
      <Aviso tipo={resultado?.tipo}>{resultado?.texto}</Aviso>
      {conteudo}
    </>
  )
}
