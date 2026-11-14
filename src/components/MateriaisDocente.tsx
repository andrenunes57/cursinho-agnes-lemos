import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ErroArquivos } from '../lib/arquivos'
import { useApiArquivos } from '../lib/configuracoes'
import { mensagemDeErro } from '../lib/erros'
import { supabase } from '../lib/supabase'
import { chavesAulas, useMateriais, type Aula, type Material } from '../pages/consultasAulas'
import type { AoResultado } from '../pages/coordenacao/comum'
import { MaterialForm, type DadosMaterial } from './MaterialForm'
import { MaterialItem } from './MaterialItem'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Carregando } from './ui/Carregando'
import { Confirmacao } from './ui/Confirmacao'
import { EmptyState } from './ui/EmptyState'
import { ErroComRetry } from './ui/ErroComRetry'
import { Etiqueta } from './ui/Etiqueta'

const mensagem = (erro: unknown) => (erro instanceof ErroArquivos ? erro.message : mensagemDeErro(erro))

type Props = {
  aula: Aula
  /** Docente da aula: cria, publica, ordena e exclui (RF-11/RF-12). */
  podeEditar: boolean
  /** Coordenação: só exclui, para moderação (§7.2). */
  podeExcluir: boolean
  avisar: AoResultado
}

/** Aba Materiais de /docente/aulas/:id. */
export function MateriaisDocente({ aula, podeEditar, podeExcluir, avisar }: Props) {
  const qc = useQueryClient()
  const api = useApiArquivos()
  const materiais = useMateriais(aula.id)
  const [criando, setCriando] = useState(false)
  const chave = chavesAulas.materiais(aula.id)
  const recarregar = () => qc.invalidateQueries({ queryKey: chave })

  const criar = useMutation({
    mutationFn: async (d: DadosMaterial) => {
      const lista = materiais.data ?? []
      const ordem = lista.length ? Math.max(...lista.map((m) => m.ordem)) + 1 : 0
      const base = { aula_id: aula.id, titulo: d.titulo, ordem }

      if (d.tipo === 'arquivo') {
        // §6.2: primeiro o arquivo (Apps Script grava em `arquivos`), depois o material.
        const meta = await api.enviar(d.arquivo, 'material')
        const { error } = await supabase.from('materiais').insert({ ...base, tipo: 'arquivo', arquivo_id: meta.id })
        if (error) {
          // Não deixa o arquivo órfão se o material não pôde ser salvo.
          await api.excluir(meta.id).catch(() => undefined)
          throw error
        }
        return
      }
      const campos = d.tipo === 'texto' ? { conteudo: d.conteudo } : { url: d.url }
      const { error } = await supabase.from('materiais').insert({ ...base, tipo: d.tipo, ...campos })
      if (error) throw error
    },
    onSuccess: async (_, d) => {
      await recarregar()
      setCriando(false)
      avisar({ tipo: 'sucesso', texto: `Material ${d.titulo} salvo como rascunho.` })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagem(erro) }),
  })

  const publicar = useMutation({
    mutationFn: async ({ m, publicado }: { m: Material; publicado: boolean }) => {
      const { error } = await supabase.from('materiais').update({ publicado }).eq('id', m.id)
      if (error) throw error
    },
    onSuccess: async (_, { m, publicado }) => {
      await recarregar()
      avisar({
        tipo: 'sucesso',
        texto: publicado ? `Material ${m.titulo} publicado para a turma.` : `Material ${m.titulo} voltou para rascunho.`,
      })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagem(erro) }),
  })

  const mover = useMutation({
    mutationFn: async ({ indice, destino }: { indice: number; destino: number }) => {
      const lista = [...(materiais.data ?? [])]
      const [item] = lista.splice(indice, 1)
      lista.splice(destino, 0, item)
      // Regrava a ordem 0..n-1 só onde mudou (materiais antigos podem ter ordens repetidas).
      const mudancas = lista.map((m, i) => ({ m, i })).filter(({ m, i }) => m.ordem !== i)
      const resultados = await Promise.all(
        mudancas.map(({ m, i }) => supabase.from('materiais').update({ ordem: i }).eq('id', m.id)),
      )
      const erro = resultados.find((r) => r.error)?.error
      if (erro) throw erro
      return item
    },
    onSuccess: async (item, { destino }) => {
      await recarregar()
      avisar({ tipo: 'sucesso', texto: `Material ${item.titulo} movido para a posição ${destino + 1}.` })
    },
    onError: async (erro) => {
      await recarregar()
      avisar({ tipo: 'erro', texto: mensagem(erro) })
    },
  })

  const excluir = useMutation({
    mutationFn: async (m: Material) => {
      // §10.3: primeiro o material (a FK de arquivos é restrict), depois o arquivo.
      const { error } = await supabase.from('materiais').delete().eq('id', m.id)
      if (error) throw error
      if (!m.arquivo_id) return true
      try {
        await api.excluir(m.arquivo_id)
        return true
      } catch {
        return false // vira órfão; a coordenação limpa em Armazenamento (RF-25)
      }
    },
    onSuccess: async (arquivoRemovido, m) => {
      await recarregar()
      avisar({
        tipo: 'sucesso',
        texto: arquivoRemovido
          ? `Material ${m.titulo} excluído.`
          : `Material ${m.titulo} excluído. O arquivo não pôde ser removido do Drive agora e ficará na lista de órfãos do Armazenamento.`,
      })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagem(erro) }),
  })

  if (materiais.isPending) return <Carregando texto="Carregando materiais…" />
  if (materiais.isError) {
    return <ErroComRetry mensagem="Não foi possível carregar os materiais." onTentarDeNovo={() => void materiais.refetch()} />
  }

  const lista = materiais.data
  const ocupado = mover.isPending || publicar.isPending

  return (
    <div className="flex flex-col gap-4">
      <h2 className="sr-only">Materiais</h2>
      {podeEditar &&
        (criando ? (
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Novo material</h2>
            <MaterialForm
              maxBytes={api.maxBytes}
              arquivosDisponiveis={api.configurada}
              enviando={criar.isPending}
              onEnviar={(d) => criar.mutate(d)}
              onCancelar={() => setCriando(false)}
            />
          </Card>
        ) : (
          <Button className="self-start" onClick={() => setCriando(true)}>
            Adicionar material
          </Button>
        ))}

      {lista.length === 0 ? (
        <EmptyState titulo="Nenhum material nesta aula">
          <p>
            {podeEditar
              ? 'Use “Adicionar material” para planejar a aula. Tudo começa como rascunho e só aparece para a turma depois de publicado.'
              : 'A pessoa docente ainda não adicionou materiais.'}
          </p>
        </EmptyState>
      ) : (
        <ol className="flex flex-col gap-3" aria-label="Materiais da aula, na ordem em que a turma vê">
          {lista.map((m, i) => (
            <li key={m.id}>
              <MaterialItem
                material={m}
                etiquetas={
                  <Etiqueta tom={m.publicado ? 'sucesso' : 'neutro'}>{m.publicado ? 'Publicado' : 'Rascunho'}</Etiqueta>
                }
                acoes={
                  (podeEditar || podeExcluir) && (
                    <div className="flex flex-wrap gap-2">
                      {podeEditar && (
                        <>
                          <Button
                            variante={m.publicado ? 'secundario' : 'primario'}
                            aria-label={m.publicado ? `Voltar ${m.titulo} para rascunho` : `Publicar ${m.titulo}`}
                            disabled={ocupado}
                            onClick={() => publicar.mutate({ m, publicado: !m.publicado })}
                          >
                            {m.publicado ? 'Voltar para rascunho' : 'Publicar'}
                          </Button>
                          <Button
                            variante="secundario"
                            aria-label={`Subir ${m.titulo}`}
                            disabled={ocupado || i === 0}
                            onClick={() => mover.mutate({ indice: i, destino: i - 1 })}
                          >
                            Subir
                          </Button>
                          <Button
                            variante="secundario"
                            aria-label={`Descer ${m.titulo}`}
                            disabled={ocupado || i === lista.length - 1}
                            onClick={() => mover.mutate({ indice: i, destino: i + 1 })}
                          >
                            Descer
                          </Button>
                        </>
                      )}
                      <Confirmacao
                        rotulo="Excluir"
                        rotuloAcessivel={`Excluir ${m.titulo}`}
                        rotuloConfirmar="Confirmar exclusão"
                        aviso={
                          m.tipo === 'arquivo'
                            ? 'O material sai da aula e o arquivo vai para a lixeira do Drive. Não dá para desfazer.'
                            : 'O material sai da aula. Não dá para desfazer.'
                        }
                        carregando={excluir.isPending && excluir.variables?.id === m.id}
                        onConfirmar={() => excluir.mutate(m)}
                      />
                    </div>
                  )
                }
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
