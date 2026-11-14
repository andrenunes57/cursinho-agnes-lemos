import { createBrowserRouter, type RouteObject } from 'react-router'
import { RequirePapel, RequireSessao, RequireStatus } from './auth/guardas'
import { LayoutApp } from './layout/LayoutApp'
import { RaizApp } from './layout/RaizApp'
import { Aguardando } from './pages/acesso/Aguardando'
import { Armazenamento } from './pages/coordenacao/Armazenamento'
import { Configuracoes } from './pages/coordenacao/Configuracoes'
import { Cronograma } from './pages/coordenacao/Cronograma'
import { Disciplinas } from './pages/coordenacao/Disciplinas'
import { Frequencia as FrequenciaCoordenacao } from './pages/coordenacao/Frequencia'
import { Pessoas } from './pages/coordenacao/Pessoas'
import { Turmas } from './pages/coordenacao/Turmas'
import { PrimeiroAcesso } from './pages/acesso/PrimeiroAcesso'
import { AulaDocente } from './pages/docente/AulaDocente'
import { EntregasTarefa } from './pages/docente/EntregasTarefa'
import { FrequenciaDocente } from './pages/docente/FrequenciaDocente'
import { MinhasAulas } from './pages/docente/MinhasAulas'
import { Aula } from './pages/estudante/Aula'
import { Aulas } from './pages/estudante/Aulas'
import { Frequencia } from './pages/estudante/Frequencia'
import { Tarefa } from './pages/estudante/Tarefa'
import { Tarefas } from './pages/estudante/Tarefas'
import { Inicio } from './pages/Inicio'
import { NaoEncontrado } from './pages/NaoEncontrado'
import { Perfil } from './pages/Perfil'
import { Entrar } from './pages/publico/Entrar'
import { Privacidade } from './pages/publico/Privacidade'

// basename = base do Vite sem a barra final ('/cursinho-agnes-lemos'). SPEC §6.3 / §12.3.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export const rotas: RouteObject[] = [
  {
    element: <RaizApp />,
    children: [
      // Públicas
      { path: '/entrar', element: <Entrar /> },
      { path: '/privacidade', element: <Privacidade /> },

      // Guardas (SPEC §11): 1. sessão → 2. onboarding → 3. ativo → 4. papel
      {
        element: <RequireSessao />,
        children: [
          { path: '/primeiro-acesso', element: <PrimeiroAcesso /> },
          { path: '/aguardando', element: <Aguardando /> },
          {
            element: <RequireStatus />,
            children: [
              {
                element: <LayoutApp />,
                children: [
                  { path: '/', element: <Inicio /> },
                  { path: '/perfil', element: <Perfil /> },
                  {
                    element: <RequirePapel papeis={['estudante']} />,
                    children: [
                      { path: '/aulas', element: <Aulas /> },
                      { path: '/aulas/:id', element: <Aula /> },
                      { path: '/tarefas', element: <Tarefas /> },
                      { path: '/tarefas/:id', element: <Tarefa /> },
                      { path: '/frequencia', element: <Frequencia /> },
                    ],
                  },
                  {
                    element: <RequirePapel papeis={['professor', 'coordenacao']} />,
                    children: [
                      { path: '/docente/aulas', element: <MinhasAulas /> },
                      { path: '/docente/aulas/:id', element: <AulaDocente /> },
                      { path: '/docente/tarefas/:id/entregas', element: <EntregasTarefa /> },
                      { path: '/docente/frequencia', element: <FrequenciaDocente /> },
                    ],
                  },
                  {
                    element: <RequirePapel papeis={['coordenacao']} />,
                    children: [
                      { path: '/coordenacao/pessoas', element: <Pessoas /> },
                      { path: '/coordenacao/turmas', element: <Turmas /> },
                      { path: '/coordenacao/disciplinas', element: <Disciplinas /> },
                      { path: '/coordenacao/aulas', element: <Cronograma /> },
                      { path: '/coordenacao/frequencia', element: <FrequenciaCoordenacao /> },
                      { path: '/coordenacao/armazenamento', element: <Armazenamento /> },
                      { path: '/coordenacao/configuracoes', element: <Configuracoes /> },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },

      { path: '*', element: <NaoEncontrado /> },
    ],
  },
]

export const router = createBrowserRouter(rotas, { basename })
