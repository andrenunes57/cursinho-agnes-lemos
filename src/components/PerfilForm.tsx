import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import {
  LIMITE_PRONOMES,
  OPCOES_PRONOMES,
  pronomesDoBanco,
  pronomesParaBanco,
  validarPronomeOutro,
  type OpcaoPronomes,
} from '../lib/pronomes'
import { NOME_SOCIAL_MAX, validarNomeSocial } from '../lib/validacoes'
import { Button } from './ui/Button'
import { Checkbox } from './ui/Checkbox'
import { Field } from './ui/Field'
import { RadioGroup } from './ui/RadioGroup'

export type DadosPerfil = { nome_social: string; pronomes: string | null }

type Props = {
  /** `onboarding` exige o aceite do aviso de privacidade (RF-02). */
  modo: 'onboarding' | 'edicao'
  /** Valores atuais (só em /perfil). No onboarding nada vem preenchido, nem do Google. */
  inicial?: { nome_social: string | null; pronomes: string | null }
  enviando: boolean
  textoBotao: string
  onEnviar: (dados: DadosPerfil) => void
}

/** Formulário de nome social + pronomes (+ aceite), usado em /primeiro-acesso e /perfil. */
export function PerfilForm({ modo, inicial, enviando, textoBotao, onEnviar }: Props) {
  const pronomesIniciais = inicial ? pronomesDoBanco(inicial.pronomes) : { opcao: 'nao-informar' as const, outro: '' }

  const [nomeSocial, setNomeSocial] = useState(inicial?.nome_social ?? '')
  const [opcao, setOpcao] = useState<OpcaoPronomes>(pronomesIniciais.opcao)
  const [outro, setOutro] = useState(pronomesIniciais.outro)
  const [aceite, setAceite] = useState(false)
  const [tentouEnviar, setTentouEnviar] = useState(false)

  const refNome = useRef<HTMLInputElement>(null)
  const refOutro = useRef<HTMLInputElement>(null)
  const refAceite = useRef<HTMLInputElement>(null)

  const erroNome = validarNomeSocial(nomeSocial)
  const erroOutro = validarPronomeOutro(opcao, outro)
  const erroAceite = modo === 'onboarding' && !aceite ? 'Para continuar, aceite o aviso de privacidade.' : null

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setTentouEnviar(true)

    // Leva o foco ao primeiro campo com erro (SPEC §5.3: tudo por teclado).
    if (erroNome) return refNome.current?.focus()
    if (erroOutro) return refOutro.current?.focus()
    if (erroAceite) return refAceite.current?.focus()

    onEnviar({ nome_social: nomeSocial.trim(), pronomes: pronomesParaBanco(opcao, outro) })
  }

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-6">
      <Field
        ref={refNome}
        rotulo="Nome social"
        dica="É o nome que vai aparecer para docentes e para a coordenação."
        obrigatorio
        autoComplete="off"
        maxLength={NOME_SOCIAL_MAX + 20}
        value={nomeSocial}
        onChange={(e) => setNomeSocial(e.target.value)}
        erro={tentouEnviar ? erroNome : null}
      />

      <RadioGroup
        legenda="Pronomes (opcional)"
        nome="pronomes"
        opcoes={OPCOES_PRONOMES}
        valor={opcao}
        onChange={setOpcao}
      >
        {opcao === 'outro' && (
          <div className="mt-2 pl-8">
            <Field
              ref={refOutro}
              rotulo="Quais são seus pronomes?"
              dica={`Até ${LIMITE_PRONOMES} caracteres.`}
              obrigatorio
              autoComplete="off"
              value={outro}
              onChange={(e) => setOutro(e.target.value)}
              erro={tentouEnviar ? erroOutro : null}
            />
          </div>
        )}
      </RadioGroup>

      {modo === 'onboarding' && (
        <Checkbox
          ref={refAceite}
          checked={aceite}
          onChange={(e) => setAceite(e.target.checked)}
          erro={tentouEnviar ? erroAceite : null}
        >
          Li e aceito o{' '}
          <Link to="/privacidade" target="_blank" className="font-semibold text-marca underline underline-offset-4">
            aviso de privacidade (abre em nova aba)
          </Link>
          .
        </Checkbox>
      )}

      <Button type="submit" carregando={enviando} textoCarregando="Salvando…" className="self-start">
        {textoBotao}
      </Button>
    </form>
  )
}
