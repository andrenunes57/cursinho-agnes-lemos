import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { mensagemDeErro } from '../lib/erros'
import { supabase } from '../lib/supabase'
import type { Aula } from '../pages/consultasAulas'
import { invalidarTarefas, useTarefasDaAula, type TarefaComEntregas } from '../pages/consultasTarefas'
import { plural, type AoResultado } from '../pages/coordenacao/comum'
import { classeLink } from './LinkExterno'
import { TarefaForm, type DadosTarefa } from './TarefaForm'
import { TarefaResumo } from './TarefaResumo'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Carregando } from './ui/Carregando'
import { Confirmacao } from './ui/Confirmacao'
import { EmptyState } from './ui/EmptyState'
import { ErroComRetry } from './ui/ErroComRetry'
import { Etiqueta } from './ui/Etiqueta'
import { FocarAoAbrir } from './ui/FocarAoAbrir'

type Props = {
  aula: Aula
  /** Docente da aula: cria, edita, publica e exclui (RF-15). */
  podeEditar: boolean
  /** Coordenação: só exclui, para moderação (§7.2). */
  podeExcluir: boolean
  avisar: AoResultado
}

function contagem(t: TarefaComEntregas): string {
  const total = t.entregas.length
  const aguardando = t.entregas.filter((e) => !e.avaliada_em).length
  if (total === 0) return 'Nenhuma entrega ainda'
  const base = plural(total, 'entrega', 'entregas')
  return aguardando ? `${base} · ${aguardando} aguardando avaliação` : `${base} · todas avaliadas`
}

/** Aba Tarefas de /docente/aulas/:id (RF-15). */
export function TarefasDocente({ aula, podeEditar, podeExcluir, avisar }: Props) {
  const qc = useQueryClient()
  const tarefas = useTarefasDaAula(aula.id)
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)

  const criar = useMutation({
    mutationFn: async (d: DadosTarefa) => {
      const { error } = await supabase.from('tarefas').insert({ aula_id: aula.id, ...d })
      if (error) throw error
    },
    onSuccess: async (_, d) => {
      await invalidarTarefas(qc)
      setCriando(false)
      avisar({
        tipo: 'sucesso',
        texto: d.publicada ? `Tarefa ${d.titulo} publicada para a turma.` : `Tarefa ${d.titulo} salva como rascunho.`,
      })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro) }),
  })

  const salvar = useMutation({
    mutationFn: async ({ id, d }: { id: string; d: DadosTarefa }) => {
      // `publicada` não muda pela edição; tem botão próprio.
      const { titulo, instrucoes, prazo, tipo_avaliacao, opcoes_conceito } = d
      const { error } = await supabase
        .from('tarefas')
        .update({ titulo, instrucoes, prazo, tipo_avaliacao, opcoes_conceito })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: async (_, { d }) => {
      await invalidarTarefas(qc)
      setEditando(null)
      avisar({ tipo: 'sucesso', texto: `Tarefa ${d.titulo} atualizada.` })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro) }),
  })

  const publicar = useMutation({
    mutationFn: async ({ t, publicada }: { t: TarefaComEntregas; publicada: boolean }) => {
      const { error } = await supabase.from('tarefas').update({ publicada }).eq('id', t.id)
      if (error) throw error
    },
    onSuccess: async (_, { t, publicada }) => {
      await invalidarTarefas(qc)
      avisar({
        tipo: 'sucesso',
        texto: publicada ? `Tarefa ${t.titulo} publicada para a turma.` : `Tarefa ${t.titulo} voltou para rascunho.`,
      })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro) }),
  })

  const excluir = useMutation({
    mutationFn: async (t: TarefaComEntregas) => {
      // As entregas caem em cascata; os arquivos delas viram órfãos (§8.4, limpeza em RF-25).
      const { error } = await supabase.from('tarefas').delete().eq('id', t.id)
      if (error) throw error
    },
    onSuccess: async (_, t) => {
      await invalidarTarefas(qc)
      avisar({ tipo: 'sucesso', texto: `Tarefa ${t.titulo} excluída.` })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro) }),
  })

  if (tarefas.isPending) return <Carregando texto="Carregando tarefas…" />
  if (tarefas.isError) {
    return <ErroComRetry mensagem="Não foi possível carregar as tarefas." onTentarDeNovo={() => void tarefas.refetch()} />
  }

  const lista = tarefas.data

  return (
    <div className="flex flex-col gap-4">
      <h2 className="sr-only">Tarefas</h2>
      {podeEditar &&
        (criando ? (
          <FocarAoAbrir>
            <Card>
              <h2 className="mb-4 text-lg font-semibold">Nova tarefa</h2>
              <TarefaForm
                enviando={criar.isPending}
                textoBotao="Criar tarefa"
                onEnviar={(d) => criar.mutate(d)}
                onCancelar={() => setCriando(false)}
              />
            </Card>
          </FocarAoAbrir>
        ) : (
          <Button className="self-start" onClick={() => setCriando(true)}>
            Nova tarefa
          </Button>
        ))}

      {lista.length === 0 ? (
        <EmptyState titulo="Nenhuma tarefa nesta aula">
          <p>
            {podeEditar
              ? 'Use “Nova tarefa” para propor uma atividade. Ela só aparece para a turma depois de publicada.'
              : 'A pessoa docente ainda não criou tarefas.'}
          </p>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Tarefas da aula">
          {lista.map((t) => {
            const temEntregas = t.entregas.length > 0
            const temAvaliada = t.entregas.some((e) => e.avaliada_em)
            return (
              <li key={t.id}>
                <article className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4 shadow-sm">
                  {editando === t.id ? (
                    <FocarAoAbrir>
                      <>
                        <h3 className="text-lg font-semibold">Editar tarefa</h3>
                        <TarefaForm
                          inicial={t}
                          avaliacaoTravada={temAvaliada}
                          enviando={salvar.isPending}
                          textoBotao="Salvar tarefa"
                          onEnviar={(d) => salvar.mutate({ id: t.id, d })}
                          onCancelar={() => setEditando(null)}
                        />
                      </>
                    </FocarAoAbrir>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="min-w-0 text-lg font-semibold break-words">{t.titulo}</h3>
                        <Etiqueta tom={t.publicada ? 'sucesso' : 'neutro'}>{t.publicada ? 'Publicada' : 'Rascunho'}</Etiqueta>
                      </div>
                      <TarefaResumo tarefa={t} />
                      <p className="text-sm font-medium">{contagem(t)}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/docente/tarefas/${t.id}/entregas`} className={`min-h-11 content-center px-1 ${classeLink}`}>
                          Ver entregas<span className="sr-only"> de {t.titulo}</span>
                        </Link>
                        {podeEditar && (
                          <>
                            <Button variante="secundario" aria-label={`Editar ${t.titulo}`} onClick={() => setEditando(t.id)}>
                              Editar
                            </Button>
                            {/* Voltar para rascunho só sem entregas: senão a turma perderia a tarefa já respondida. */}
                            {(!t.publicada || !temEntregas) && (
                              <Button
                                variante={t.publicada ? 'secundario' : 'primario'}
                                aria-label={t.publicada ? `Voltar para rascunho: ${t.titulo}` : `Publicar ${t.titulo}`}
                                disabled={publicar.isPending}
                                onClick={() => publicar.mutate({ t, publicada: !t.publicada })}
                              >
                                {t.publicada ? 'Voltar para rascunho' : 'Publicar'}
                              </Button>
                            )}
                          </>
                        )}
                        {(podeEditar || podeExcluir) && (
                          <Confirmacao
                            rotulo="Excluir"
                            rotuloAcessivel={`Excluir ${t.titulo}`}
                            rotuloConfirmar="Confirmar exclusão"
                            aviso={
                              temEntregas
                                ? 'A tarefa e todas as entregas dela serão apagadas, inclusive as avaliações. Não dá para desfazer.'
                                : 'A tarefa sai da aula. Não dá para desfazer.'
                            }
                            carregando={excluir.isPending && excluir.variables?.id === t.id}
                            onConfirmar={() => excluir.mutate(t)}
                          />
                        )}
                      </div>
                    </>
                  )}
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
