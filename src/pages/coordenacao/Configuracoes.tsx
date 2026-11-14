import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { Aviso } from '../../components/ui/Aviso'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Carregando } from '../../components/ui/Carregando'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { Field } from '../../components/ui/Field'
import { MAX_MB_PADRAO } from '../../lib/arquivos'
import { chaveConfiguracoes, useConfiguracoes, type Configuracoes as Valores } from '../../lib/configuracoes'
import { mensagemDeErro } from '../../lib/erros'
import { supabase } from '../../lib/supabase'
import { ehUrlHttp } from '../../lib/validacoes'
import { useResultado } from './comum'

const CONTA_MAX = 40

function validarUrlApi(valor: string): string | null {
  const texto = valor.trim()
  if (!texto) return null // vazio = envio de arquivos desligado
  if (!ehUrlHttp(texto) || !texto.startsWith('https://')) return 'Use a URL completa, começando com https://.'
  return null
}

function validarConta(valor: string): string | null {
  const texto = valor.trim()
  if (!texto) return 'Informe o rótulo da conta, como drive-01.'
  if (texto.length > CONTA_MAX) return `Use no máximo ${CONTA_MAX} caracteres.`
  if (!/^[A-Za-z0-9._-]+$/.test(texto)) return 'Use só letras sem acento, números, ponto, hífen ou sublinhado.'
  return null
}

function validarMaxMb(valor: string): string | null {
  const n = Number(valor)
  if (!valor.trim() || !Number.isInteger(n)) return 'Informe um número inteiro de MB.'
  if (n < 1 || n > MAX_MB_PADRAO) return `Use um valor entre 1 e ${MAX_MB_PADRAO} MB.`
  return null
}

function FormConfiguracoes({ inicial, enviando, onEnviar }: { inicial: Valores; enviando: boolean; onEnviar: (v: Valores) => void }) {
  const [url, setUrl] = useState(inicial.url)
  const [conta, setConta] = useState(inicial.conta)
  const [maxMb, setMaxMb] = useState(String(inicial.maxMb))
  const [tentou, setTentou] = useState(false)
  const refUrl = useRef<HTMLInputElement>(null)
  const refConta = useRef<HTMLInputElement>(null)
  const refMax = useRef<HTMLInputElement>(null)

  const erros = { url: validarUrlApi(url), conta: validarConta(conta), maxMb: validarMaxMb(maxMb) }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTentou(true)
    if (erros.url) return refUrl.current?.focus()
    if (erros.conta) return refConta.current?.focus()
    if (erros.maxMb) return refMax.current?.focus()
    onEnviar({ url: url.trim(), conta: conta.trim(), maxMb: Number(maxMb) })
  }

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      <Field
        ref={refUrl}
        rotulo="URL da API de Arquivos"
        dica="A URL /exec da implantação do Apps Script. Vazia desliga o envio de arquivos."
        type="url"
        inputMode="url"
        autoComplete="off"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        erro={tentou ? erros.url : null}
      />
      <Field
        ref={refConta}
        rotulo="Rótulo da conta de armazenamento"
        dica="Gravado em cada arquivo novo, para saber em qual Drive ele está (ex.: drive-01)."
        obrigatorio
        autoComplete="off"
        value={conta}
        onChange={(e) => setConta(e.target.value)}
        erro={tentou ? erros.conta : null}
      />
      <Field
        ref={refMax}
        rotulo="Limite por arquivo (MB)"
        dica={`De 1 a ${MAX_MB_PADRAO}. A API de Arquivos também aplica o próprio limite.`}
        obrigatorio
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_MB_PADRAO}
        value={maxMb}
        onChange={(e) => setMaxMb(e.target.value)}
        erro={tentou ? erros.maxMb : null}
      />
      <Button type="submit" className="self-start" carregando={enviando} textoCarregando="Salvando…">
        Salvar configurações
      </Button>
    </form>
  )
}

/** /coordenacao/configuracoes — URL da API de Arquivos, rótulo da conta e limite (RF-26). */
export function Configuracoes() {
  const qc = useQueryClient()
  const { resultado, avisar } = useResultado()
  const configuracoes = useConfiguracoes()

  const salvar = useMutation({
    mutationFn: async (v: Valores) => {
      const { error } = await supabase.from('configuracoes').upsert([
        { chave: 'api_arquivos', valor: { url: v.url, conta: v.conta } },
        { chave: 'limites', valor: { max_mb: v.maxMb } },
      ])
      if (error) throw error
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: chaveConfiguracoes })
      avisar({ tipo: 'sucesso', texto: 'Configurações salvas.' })
    },
    onError: (erro) => avisar({ tipo: 'erro', texto: mensagemDeErro(erro) }),
  })

  let conteudo
  if (configuracoes.isPending) {
    conteudo = <Carregando texto="Carregando configurações…" />
  } else if (configuracoes.isError) {
    conteudo = (
      <ErroComRetry mensagem="Não foi possível carregar as configurações." onTentarDeNovo={() => void configuracoes.refetch()} />
    )
  } else {
    conteudo = (
      <Card>
        <FormConfiguracoes inicial={configuracoes.data} enviando={salvar.isPending} onEnviar={(v) => salvar.mutate(v)} />
      </Card>
    )
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-marca">Configurações</h1>
      <p>Valem na hora para todo mundo, sem precisar publicar o app de novo.</p>
      <Aviso tipo={resultado?.tipo}>{resultado?.texto}</Aviso>
      {conteudo}
    </>
  )
}
