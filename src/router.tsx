import { createBrowserRouter } from 'react-router'
import { NaoEncontrado } from './pages/NaoEncontrado'
import { Ola } from './pages/publico/Ola'

// basename = base do Vite sem a barra final ('/cursinho-agnes-lemos'). SPEC §6.3 / §12.3.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export const router = createBrowserRouter(
  [
    { path: '/', element: <Ola /> },
    { path: '*', element: <NaoEncontrado /> },
  ],
  { basename },
)
