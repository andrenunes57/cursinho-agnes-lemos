import { useState } from 'react'
import { useSessao } from '../../auth/useSessao'
import { supabase, urlDeRetorno } from '../../lib/supabase'

const botao =
  'min-h-11 rounded-lg px-5 font-semibold text-white bg-marca hover:bg-marca-escura disabled:opacity-60 disabled:cursor-not-allowed'

/**
 * Página provisória da F0: prova que o deploy e o login com Google funcionam.
 * Será substituída pelas telas /entrar e Início na F2 (SPEC §11).
 * Nunca exibe nome nem foto da conta Google (SPEC §5.4).
 */
export function Ola() {
  const { carregando, sessao } = useSessao()
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function entrar() {
    setErro(null)
    setEnviando(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: urlDeRetorno() },
    })
    if (error) {
      setErro('Não foi possível iniciar o login com Google. Tente de novo.')
      setEnviando(false)
    }
  }

  async function sair() {
    setErro(null)
    const { error } = await supabase.auth.signOut()
    if (error) setErro('Não foi possível sair. Tente de novo.')
  }

  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6 text-slate-900">
      <h1 className="text-2xl font-bold text-marca">Cursinho Popular Professor Agnes Lemos</h1>
      <p>Sistema de presença, materiais e entregas — em construção.</p>

      <div aria-live="polite" className="flex flex-col items-start gap-3">
        {carregando ? (
          <p>Verificando sua sessão…</p>
        ) : sessao ? (
          <>
            <p>
              Você entrou com o e-mail <strong>{sessao.user.email}</strong>.
            </p>
            <button type="button" className={botao} onClick={sair}>
              Sair
            </button>
          </>
        ) : (
          <button type="button" className={botao} onClick={entrar} disabled={enviando}>
            {enviando ? 'Abrindo o Google…' : 'Entrar com Google'}
          </button>
        )}
      </div>

      {erro && (
        <p role="alert" className="font-medium text-red-800">
          {erro}
        </p>
      )}
    </main>
  )
}
