# CLAUDE.md — Cursinho Agnes Lemos

Sistema web (PI 2 Univesp) de presença, materiais por aula, entregas e gestão de pessoas do
Cursinho Popular Professor Agnes Lemos (Campinas-SP).

**Fonte da verdade: [SPEC.md](SPEC.md).** Antes de codar, leia as seções que a fase atual indica
(§13). O que não está na SPEC está fora do escopo. Uma mudança de escopo entra primeiro na SPEC
(§19 Histórico) e só depois no código.

## Estado atual

- **F0 concluída** (13/11/2026). **Próxima: F1** (banco, RLS, RPCs, seed e pgTAP), seções §8 e §9.
- Recursos na nuvem e identificadores: SPEC §12.3.1.
- `.env.local` aponta para o Supabase **na nuvem**, porque foi assim na F0. Na F1, trocar pelos
  valores do stack local (`npx supabase status`).

## Comandos

| Objetivo | Comando |
|---|---|
| Dev | `npm run dev` → http://localhost:5173/cursinho-agnes-lemos/ |
| Qualidade (o mesmo que o CI roda) | `npm run lint && npm run typecheck && npm test && npm run build` |
| E2E + acessibilidade (axe) | `npm run test:e2e` (build + preview na porta 4173) |
| Banco local (Docker/Rancher Desktop ligado) | `npm run db:start` · `npm run db:reset` · `npm run db:test` · `npm run db:types` |
| Aplicar migrations na nuvem | `npx supabase db push` (projeto já vinculado; pode pedir a senha do banco) |

## Regras (resumo do SPEC §15)

- **Consultar o Context7** antes de usar a API de qualquer biblioteca. Use as versões **fixas** do
  `package.json`. Atenção às versões novas:
  - React Router **v8**: `createBrowserRouter` vem de `react-router` e `RouterProvider` de `react-router/dom`.
  - Vite **8** (Rolldown), TypeScript **7**, Vitest **5**, Tailwind **v4** (`@import "tailwindcss"`, tokens em `@theme`).
  - Lint com **oxlint** (padrão do create-vite 9).
- **Banco:**
  - Os tipos vêm de `npm run db:types` e nunca são escritos à mão.
  - Migration já aplicada é imutável: crie uma nova.
- **Segurança fica no banco**: RLS + RPC + teste pgTAP. Guarda de rota e botão escondido são só UX.
- **Identidade:**
  - Nunca exibir o nome nem a foto da conta Google; usar sempre o nome social + pronomes.
  - UI em pt-BR, com linguagem inclusiva.
- **Segredos nunca entram no repo.** Só a chave *publishable* vai para o front (`.env.production`).
  Senha do banco, chave secreta do OAuth e `sb_secret_…` ficam fora do git.
- **Máquina:** usar `py` (nunca `python`) e `pwsh` (nunca `powershell`). O shell do Claude Code é Git Bash.
- **Fechar uma fase** exige:
  - DoD verde
  - conferência no viewport de 375 px
  - commit em Conventional Commits, por exemplo `feat(f1): ...`
