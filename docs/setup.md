# Preparar o ambiente de desenvolvimento

Este guia mostra como rodar o sistema no seu computador, testar mudanças e publicar.
Ele foi escrito para quem vai manter o sistema e pode não ter experiência com cada ferramenta.
A especificação completa está em [SPEC.md](../SPEC.md). Neste guia, "§" indica a seção da SPEC.

## 1. O que instalar (uma vez)

1. **Git**: https://git-scm.com
2. **Node.js 22.22 ou mais novo** (o projeto usa a versão do arquivo `.nvmrc`): https://nodejs.org
3. **Docker Desktop** ou **Rancher Desktop**. É ele que roda o banco local do Supabase.
   Deixe-o aberto sempre que for usar o banco local.
4. Um editor, por exemplo o VS Code.

Confira no terminal:

```bash
git --version
node --version   # v22.22 ou mais novo
docker ps        # não pode dar erro
```

## 2. Baixar o projeto e instalar as dependências

```bash
git clone https://github.com/andrenunes57/cursinho-agnes-lemos.git
cd cursinho-agnes-lemos
npm ci
npx playwright install chromium   # navegador dos testes E2E (só na 1ª vez)
```

## 3. Subir o banco local

```bash
npm run db:start
```

Na 1ª vez, isso baixa as imagens do Supabase e demora alguns minutos. No fim, o comando mostra a
URL da API (`http://127.0.0.1:54321`) e as chaves **locais**. Elas só valem no seu computador.

- `npm run db:reset`: apaga o banco local e recria tudo a partir das migrations e do seed
  (1 turma e 8 disciplinas).
- `npm run db:stop`: desliga o banco local.

## 4. Criar o `.env.local`

Crie na raiz do projeto um arquivo `.env.local` (ele **não** vai para o git):

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<a "Publishable key" que o `npx supabase status` mostra>
VITE_API_ARQUIVOS_URL=<a URL /exec da API de Arquivos>
```

A URL `/exec` está no §12.3.1 da SPEC e em **Coordenação → Configurações** no app.

### Login com Google no banco local (opcional)

O login local usa o mesmo cliente OAuth da produção (o id já está no `supabase/config.toml`).

1. Crie `supabase/.env` (fora do git) com a chave secreta do cliente OAuth (peça a quem é dona
   do projeto no Google Cloud):

   ```
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=<chave secreta do cliente OAuth>
   ```

2. No `supabase/config.toml`, em `[auth.external.google]`, troque `enabled = false` para `true`
   **só no seu computador**. Não faça commit dessa troca.
3. Rode `npm run db:stop && npm run db:start`. Faça login uma vez no app local. Então, no
Studio local (http://127.0.0.1:54323 → SQL Editor), torne a sua conta coordenação:

```sql
update public.perfis set papel = 'coordenacao', status = 'ativo' where email = '<seu e-mail>';
```

## 5. Rodar o app

```bash
npm run dev
```

Abra http://localhost:5173/cursinho-agnes-lemos/.

## 6. Testar antes de publicar

| O que testar | Comando | Precisa do banco local? |
|---|---|---|
| Qualidade (o mesmo que o CI roda) | `npm run lint && npm run typecheck && npm test && npm run build` | Não |
| Testes do banco (RLS e RPCs, pgTAP) | `npm run db:reset && npm run db:test` | Sim |
| E2E + acessibilidade (Playwright + axe), em 375 px e 1280 px | `npm run test:e2e` | Sim |

Observações:

- O E2E cria contas `*@teste.local` no banco local. Por isso, **depois de rodar o E2E**, os testes
  do banco exigem `npm run db:reset && npm run db:test`.
- Para reproduzir o CI (sem `.env.local`): `VITE_SUPABASE_URL= npx vitest run`.
- Se mudar o banco, crie uma **migration nova** em `supabase/migrations/`. Nunca edite uma
  migration que já foi aplicada. Depois rode `npm run db:types` para gerar os tipos.

## 7. Publicar

### App (GitHub Pages)

Todo push na branch `main` publica o app (workflow `deploy.yml`). Acompanhe em
**GitHub → Actions**. As variáveis do build estão em `.env.production`. Elas são públicas.
**Nunca** coloque nesse arquivo a chave secreta (`sb_secret_…`).

### Banco (Supabase na nuvem)

```bash
npx supabase link --project-ref elxqckorrrwidoqgojfw   # 1ª vez; pede a senha do banco
npx supabase db push --remote                          # aplica as migrations novas
npx supabase migration list --remote                   # confere
```

Sem `--remote`, o CLI 3.x aplica no banco **local**.

### API de Arquivos (Apps Script)

O código está em `apps-script/Code.js`. Para publicar sem mudar a URL `/exec`:

```bash
npx clasp login                 # 1ª vez, com a conta dona do Apps Script
npm run gas:push
npx clasp create-deployment -i <deployment id do §12.3.1> -d "descrição da mudança"
```

**Sempre use `-i`.** Sem ele, o clasp cria uma implantação nova com outra URL, e o app para de
enviar arquivos até alguém trocar a URL em **Coordenação → Configurações**.

## 8. Regras do projeto

- O que não está na SPEC está fora do escopo. Toda mudança de escopo entra primeiro no §19.
- A segurança fica no banco (RLS + RPC + teste pgTAP). Esconder botão é só conveniência.
- A interface é em pt-BR e usa linguagem inclusiva. O app nunca mostra o nome nem a foto da conta
  Google, só o nome social e os pronomes.
- Segredos nunca entram no repositório.
