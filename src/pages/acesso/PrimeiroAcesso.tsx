import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router'
import { chavePerfil, concluiuOnboarding, useAuth } from '../../auth/contexto'
import { PaginaSimples } from '../../components/PaginaSimples'
import { PerfilForm, type DadosPerfil } from '../../components/PerfilForm'
import { Aviso } from '../../components/ui/Aviso'
import { supabase } from '../../lib/supabase'

/** /primeiro-acesso — nome social, pronomes e aceite do aviso de privacidade (RF-02). */
export function PrimeiroAcesso() {
  const { perfil, sair } = useAuth()
  const queryClient = useQueryClient()

  const salvar = useMutation({
    mutationFn: async (dados: DadosPerfil) => {
      const { error } = await supabase
        .from('perfis')
        .update({ ...dados, consentimento_em: new Date().toISOString() })
        .eq('id', perfil?.id as string)
      if (error) throw error
    },
    // Com o perfil atualizado, as guardas levam a pessoa a /aguardando (ou ao Início).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chavePerfil(perfil?.id) }),
  })

  if (!perfil) return null
  if (concluiuOnboarding(perfil)) return <Navigate to="/" replace />

  return (
    <PaginaSimples>
      <h1 className="text-3xl font-bold text-marca">Boas-vindas ao Cursinho Agnes Lemos!</h1>
      <p>
        Antes de começar, conte para a gente o seu nome social e, se quiser, os seus pronomes. Eles aparecem para docentes e para a coordenação.
      </p>

      {salvar.isError && <Aviso tipo="erro">Não foi possível salvar. Confira sua conexão e tente de novo.</Aviso>}

      <PerfilForm modo="onboarding" enviando={salvar.isPending} textoBotao="Continuar" onEnviar={salvar.mutate} />

      <button
        type="button"
        onClick={() => void sair()}
        className="min-h-11 self-start font-semibold text-marca underline underline-offset-4"
      >
        Sair
      </button>
    </PaginaSimples>
  )
}
