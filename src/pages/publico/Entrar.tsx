import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/contexto'
import { PaginaSimples } from '../../components/PaginaSimples'
import { Aviso } from '../../components/ui/Aviso'
import { Button } from '../../components/ui/Button'
import { Carregando } from '../../components/ui/Carregando'
import { MENSAGEM_ERRO_RETORNO, temErroDeRetorno } from '../../lib/retornoOAuth'
import { supabase, urlDeRetorno } from '../../lib/supabase'

/** /entrar — login somente com Google (RF-01, ADR-04). */
export function Entrar() {
  const { carregando, sessao } = useAuth()
  const { search, hash } = useLocation()
  const navigate = useNavigate()
  const [erroRetorno] = useState(() => temErroDeRetorno(search, hash))
  const [erro, setErro] = useState<string | null>(erroRetorno ? MENSAGEM_ERRO_RETORNO : null)
  const [enviando, setEnviando] = useState(false)

  // Mostra a mensagem amigável e limpa a URL (RF-01).
  useEffect(() => {
    if (erroRetorno) navigate('/entrar', { replace: true })
  }, [erroRetorno, navigate])

  if (!carregando && sessao) return <Navigate to="/" replace />

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

  return (
    <PaginaSimples>
      <div className="flex flex-1 flex-col justify-center gap-6">
        <h1 className="text-3xl font-bold text-marca">Cursinho Popular Professor Agnes Lemos</h1>
        <p className="text-lg">Presença, materiais das aulas e entregas de tarefas, num só lugar.</p>

        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        {carregando ? (
          <Carregando texto="Verificando sua sessão…" />
        ) : (
          <Button onClick={entrar} carregando={enviando} textoCarregando="Abrindo o Google…" className="self-start">
            Entrar com Google
          </Button>
        )}

        <p className="text-sm text-texto-suave">
          A tela do Google pode mostrar o endereço <span className="font-mono">supabase.co</span>: é o serviço
          que o cursinho usa para o login. Usamos só o seu e-mail; seu nome e sua foto do Google não são guardados.
        </p>

        <Link to="/privacidade" className="self-start font-semibold text-marca underline underline-offset-4">
          Aviso de privacidade
        </Link>
      </div>
    </PaginaSimples>
  )
}
