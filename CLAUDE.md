# CLAUDE.md — Cursinho Agnes Lemos

Sistema web (PI 2 Univesp) de presença, materiais por aula, entregas e gestão de pessoas do
Cursinho Popular Professor Agnes Lemos (Campinas-SP).

**Fonte da verdade: [SPEC.md](SPEC.md).** Antes de codar, leia as seções que a fase atual indica
(§13). O que não está na SPEC está fora do escopo. Uma mudança de escopo entra primeiro na SPEC
(§19 Histórico) e só depois no código.

## Estado atual

- **F0, F1 e F2 concluídas** (13/11/2026). As 5 migrations estão na nuvem. A conta do dev já é
  coordenação ativa em produção (§16.1).
- **F3 concluída** (13/11/2026), também validada em produção: Turma 2027, 8 disciplinas, contas
  "Estudante Produção" e "Docente Produção" aprovadas e 2 aulas da docente.
- **F4 concluída** (14/11/2026): API de Arquivos implantada; upload validado no desktop e no Chrome
  Android (PDF + foto da câmera).
- **F5 concluída** (14/11/2026), validada em produção nos 3 tipos de avaliação.
- **F6 concluída** (14/11/2026), validada em produção: chamada e correção, % (50% em 2 aulas), CSV,
  coordenação só leitura com a RPC recusando e Armazenamento.
- **Piloto só no desktop** (decisão do dev, SPEC §19): sem PWA e sem simulação de celular. O layout
  de janela estreita (barra inferior, tabelas em cartões) **fica**: atende o zoom de 400% (WCAG 1.4.10).
  O E2E roda nos projetos `desktop` (1280×800) e `zoom` (320×640).
- **F7 concluída** (15/11/2026): `e2e/a11y.spec.ts` (todas as rotas por papel), 3 correções de foco
  (`Button` com `aria-disabled`, "Pular para o conteúdo", `FocarAoAbrir` + `lib/foco.ts`), `docs/`,
  README e roteiro §14.4 completo no desktop (SPEC §19). Todas as fases do §13 estão concluídas.
- Antes do go-live (fora das fases): transferência de contas (`docs/transferencia-de-contas.md`) e
  e-mail da LGPD em `src/lib/contato.ts`.
- Formulário aberto por botão na própria página: envolver em `ui/FocarAoAbrir`.
- **Cron-job.org adiado pelo dev** (SPEC §19): sem ping, o Supabase pode pausar após ~7 dias sem uso.
  Não cadastrar nem cobrar; se o dev decidir, seguir `docs/operacao.md` §2.
- O Chrome do dev não reduz a janela abaixo de 1920 px: a conferência em 320 px é feita com a página
  num `<iframe>` de 320 px.
- Testes que importam (direta ou indiretamente) `lib/supabase` precisam de `vi.mock('../lib/supabase', ...)`:
  no CI não há `.env.local`. Para reproduzir o CI: `VITE_SUPABASE_URL= npx vitest run`.
- API de Arquivos: `npm run gas:push` e depois `npx clasp create-deployment -i <deployment id>` (§12.3.1),
  **sempre com `-i`** para não mudar a URL `/exec`.
- No Chrome do dev, serviços Google do projeto (Drive, Apps Script) ficam na conta de índice 1: usar `/u/1/`.
- Reutilizar da F5: `pages/consultasTarefas.ts` (situação da entrega, `useEstudantesDaTurma`),
  `components/LinkExterno.tsx`, `lib/datas.ts` (prazos em hora de SP).
- Reutilizar da F6: `lib/csv.ts`, `lib/frequencia.ts`, `pages/consultasFrequencia.ts`. As rotas de todas as
  fases já têm página real (o `EmConstrucao` foi removido); a F7 cobre todas no `a11y.spec.ts`.
- Reutilizar da F3: `components/AulaForm.tsx` (sem `docentes` = docente criando a própria aula),
  `ui/Abas`, `ui/Select`, `ui/Confirmacao`, `ui/Etiqueta`, `lib/datas.ts`, `lib/erros.ts`.
- Depois de rodar o E2E, o pgTAP exige `npm run db:reset && npm run db:test` (as fixtures colidem
  com as contas do E2E).
- E-mail de contato da LGPD pendente em `src/lib/contato.ts` (trocar antes do go-live).
- Recursos na nuvem e identificadores: SPEC §12.3.1.
- `.env.local` aponta para o stack **local** do Supabase (`npx supabase status`).
- **CLI 3.x:** `db push`, `db test`, `migration list` etc. vão para o stack **local** por padrão.
  Para a nuvem, passar `--remote`.

## Comandos

| Objetivo | Comando |
|---|---|
| Dev | `npm run dev` → http://localhost:5173/cursinho-agnes-lemos/ |
| Qualidade (o mesmo que o CI roda) | `npm run lint && npm run typecheck && npm test && npm run build` |
| E2E + acessibilidade (axe) | `npm run db:start` e depois `npm run test:e2e` (build com o stack local + preview na porta 4173) |
| Banco local (Docker/Rancher Desktop ligado) | `npm run db:start` · `npm run db:reset` · `npm run db:test` · `npm run db:types` |
| Aplicar migrations na nuvem | `npx supabase db push --remote` (sem `--remote` o CLI 3.x vai para o stack local) |

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
  - conferência em 320 px de largura (zoom de 400%)
  - commit em Conventional Commits, por exemplo `feat(f1): ...`
