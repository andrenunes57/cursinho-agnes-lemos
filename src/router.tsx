import { createBrowserRouter, type RouteObject } from 'react-router'
import { RequirePapel, RequireSessao, RequireStatus } from './auth/guardas'
import { LayoutApp } from './layout/LayoutApp'
import { RaizApp } from './layout/RaizApp'
import { Aguardando } from './pages/acesso/Aguardando'
import { PrimeiroAcesso } from './pages/acesso/PrimeiroAcesso'
import { EmConstrucao } from './pages/EmConstrucao'
import { Inicio } from './pages/Inicio'
import { NaoEncontrado } from './pages/NaoEncontrado'
import { Perfil } from './pages/Perfil'
import { Entrar } from './pages/publico/Entrar'
import { Privacidade } from './pages/publico/Privacidade'

// basename = base do Vite sem a barra final ('/cursinho-agnes-lemos'). SPEC §6.3 / §12.3.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

/** Rotas das fases F3 a F6, por enquanto com a página "em construção" (SPEC §11, §13). */
const provisoria = (path: string, titulo: string): RouteObject => ({
  path,
  element: <EmConstrucao titulo={titulo} />,
})

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
                      provisoria('/aulas', 'Aulas'),
                      provisoria('/aulas/:id', 'Aula'),
                      provisoria('/tarefas', 'Tarefas'),
                      provisoria('/tarefas/:id', 'Tarefa'),
                      provisoria('/frequencia', 'Minha frequência'),
                    ],
                  },
                  {
                    element: <RequirePapel papeis={['professor', 'coordenacao']} />,
                    children: [
                      provisoria('/docente/aulas', 'Minhas aulas'),
                      provisoria('/docente/aulas/:id', 'Aula'),
                      provisoria('/docente/tarefas/:id/entregas', 'Entregas'),
                      provisoria('/docente/frequencia', 'Frequência das minhas aulas'),
                    ],
                  },
                  {
                    element: <RequirePapel papeis={['coordenacao']} />,
                    children: [
                      provisoria('/coordenacao/pessoas', 'Pessoas'),
                      provisoria('/coordenacao/turmas', 'Turmas'),
                      provisoria('/coordenacao/disciplinas', 'Disciplinas'),
                      provisoria('/coordenacao/aulas', 'Cronograma de aulas'),
                      provisoria('/coordenacao/frequencia', 'Frequência'),
                      provisoria('/coordenacao/armazenamento', 'Armazenamento'),
                      provisoria('/coordenacao/configuracoes', 'Configurações'),
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
