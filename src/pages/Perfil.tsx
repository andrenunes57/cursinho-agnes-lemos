import { useMutation, useQueryClient } from '@tanstack/react-query'
import { chavePerfil, useAuth } from '../auth/contexto'
import { PerfilForm, type DadosPerfil } from '../components/PerfilForm'
import { Aviso } from '../components/ui/Aviso'
import { Card } from '../components/ui/Card'
import { supabase } from '../lib/supabase'

/** /perfil — editar nome social e pronomes; e-mail só leitura (RF-04). */
export function Perfil() {
  const { perfil } = useAuth()
  const queryClient = useQueryClient()

  const salvar = useMutation({
    mutationFn: async (dados: DadosPerfil) => {
      const { error } = await supabase
        .from('perfis')
        .update(dados)
        .eq('id', perfil?.id as string)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chavePerfil(perfil?.id) }),
  })

  if (!perfil) return null

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-3xl font-bold text-marca">Meu perfil</h1>

      <Card>
        <p className="font-semibold">E-mail</p>
        <p className="break-all">{perfil.email}</p>
        <p className="mt-1 text-sm text-texto-suave">O e-mail vem da sua conta Google e não pode ser alterado aqui.</p>
      </Card>

      <Aviso tipo={salvar.isError ? 'erro' : 'sucesso'}>
        {salvar.isSuccess ? 'Perfil atualizado.' : null}
        {salvar.isError ? 'Não foi possível salvar. Confira sua conexão e tente de novo.' : null}
      </Aviso>

      <PerfilForm
        modo="edicao"
        inicial={{ nome_social: perfil.nome_social, pronomes: perfil.pronomes }}
        enviando={salvar.isPending}
        textoBotao="Salvar alterações"
        onEnviar={(dados) => salvar.mutate(dados)}
      />
    </div>
  )
}
