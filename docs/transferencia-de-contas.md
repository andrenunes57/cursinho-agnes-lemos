# Transferência de contas (obrigatória antes do uso real)

Hoje todos os serviços estão nas contas pessoais de quem desenvolveu o sistema (SPEC ADR-08). Antes
de o cursinho usar o sistema de verdade, eles precisam passar para contas do cursinho. Este guia
segue o §16.2 da [SPEC.md](../SPEC.md), serviço por serviço. Os identificadores atuais estão no
§12.3.1.

## 0. Antes de começar

1. Crie uma **conta Gmail dedicada ao sistema** (ex.: `sistema.agneslemos@gmail.com`). Use a conta
   principal do cursinho como e-mail de recuperação e ative a verificação em 2 etapas.
2. Defina o **e-mail de contato da LGPD** do cursinho (aparece em `/privacidade`).
3. Combine um horário com quem desenvolveu o sistema: várias etapas precisam das duas contas
   logadas ao mesmo tempo.
4. Faça um backup do banco ([operacao.md](operacao.md#4-backup-mensal)).

Siga a ordem abaixo. Ao final de cada etapa, faça a conferência indicada.

## 1. Supabase (banco e login)

URL e chaves **não mudam**, então o app não precisa de novo deploy.

1. Com a conta nova, entre em https://supabase.com e crie uma **organização** (plano Free).
2. Convide a conta de quem desenvolveu como *Owner* dessa organização.
3. Com a conta de quem desenvolveu: projeto `cursinho-agnes-lemos` → **Settings → General →
   Transfer project** → escolha a organização nova.
4. Com a conta nova: remova a conta de quem desenvolveu da organização (ou deixe como *Developer*,
   se ainda for ajudar).
5. **Conferência:** o app continua funcionando, e o ping no cron-job.org continua com 200.

A senha do banco continua a mesma. Para trocá-la: **Settings → Database → Reset database
password**. Guarde a nova senha num gerenciador de senhas do cursinho.

## 2. GitHub (código e publicação do app)

⚠️ **A URL do app muda** (de `andrenunes57.github.io/...` para `<organização>.github.io/...`).

1. Com a conta nova, crie uma **organização** no GitHub (plano Free).
2. Com a conta de quem desenvolveu: repositório → **Settings → General → Danger Zone → Transfer
   ownership** → organização nova.
3. No repositório transferido: **Settings → Pages → Source: GitHub Actions**. Em **Settings →
   Environments → github-pages**, confirme que o deploy é permitido a partir da branch `main`.
4. Rode o workflow **Deploy (GitHub Pages)** (aba Actions → *Run workflow*).
5. Atualize a URL nova em todos os lugares:
   - **Supabase → Authentication → URL Configuration:** *Site URL* = nova URL do app; em *Redirect
     URLs*, troque a antiga pela nova com `/**` no fim.
   - **Google Cloud → Google Auth Platform:** em *Branding*, os domínios autorizados (troque
     `andrenunes57.github.io`), a página inicial e a página de privacidade.
   - **Google Cloud → Clients → "Supabase Auth - app web":** em *Origens JavaScript*, a nova origem
     (`https://<organização>.github.io`).
   - `README.md` e `SPEC.md` §12.3.1 (link do app).
   - Se o nome do repositório mudar, também o `base` em `vite.config.ts`.
6. **Conferência:** abra a nova URL, saia e entre de novo com o Google.

## 3. Google Cloud (login com Google)

1. Com a conta de quem desenvolveu: console do Google Cloud → projeto `cursinho-agnes-lemos` →
   **IAM e administrador → IAM → Conceder acesso** → conta nova com o papel **Proprietário**.
2. Com a conta nova: aceite o convite e confirme que vê o projeto.
3. **Google Auth Platform → Branding:** troque o *e-mail de suporte do usuário* e o *contato do
   desenvolvedor* pelo e-mail do cursinho.
4. Remova a conta de quem desenvolveu do IAM.
5. **Conferência:** login com Google funcionando no app.

## 4. Apps Script + Drive (envio de arquivos)

Os arquivos antigos continuam na conta antiga e seguem acessíveis pelo link. Só os envios novos
vão para a conta nova.

1. Com a conta nova, no Google Drive, crie a pasta **"Sistema Cursinho"**. Abra-a e copie o id da
   pasta (o trecho da URL depois de `/folders/`).
2. Em https://script.google.com/home/usersettings, ative a **Google Apps Script API**.
3. Crie o projeto: em https://script.google.com, **Novo projeto**, com o nome "API de Arquivos —
   Cursinho Agnes Lemos". Em **Configurações do projeto**, copie o **ID do script**.
4. No computador com o repositório ([setup.md](setup.md)):

   ```bash
   npx clasp logout
   npx clasp login            # com a conta nova
   ```

   Troque o `scriptId` no `.clasp.json` pelo ID do passo 3 e rode `npm run gas:push`.
5. No editor do Apps Script → **Configurações do projeto → Propriedades do script**, crie:

   | Propriedade | Valor |
   |---|---|
   | `SUPABASE_URL` | `https://elxqckorrrwidoqgojfw.supabase.co` |
   | `SUPABASE_PUBLISHABLE_KEY` | a chave *publishable* (de `.env.production`) |
   | `PASTA_RAIZ_ID` | o id da pasta do passo 1 |
   | `MAX_BYTES` | `15728640` |
   | `CONTA_ID` | `drive-02` (ou o próximo número livre) |

   **Nunca** coloque aqui a chave secreta do Supabase.
6. No editor, escolha a função **`autorizar`** e clique em **Executar**. Aceite as permissões. O
   registro deve mostrar `Pasta raiz: Sistema Cursinho · Supabase ping: 200 "ok"`.
   Se a janela de permissões abrir com a conta errada, faça este passo numa **janela anônima** só
   com a conta nova.
7. Implante: **Implantar → Nova implantação → App da Web**, *Executar como: eu*, *Quem pode
   acessar: Qualquer pessoa*. Copie a **URL `/exec`** e o **ID da implantação**.
8. No app, **Coordenação → Configurações**: cole a URL nova, rótulo da conta = `drive-02`, salve.
9. Atualize o §12.3.1 da SPEC (scriptId, deployment id) e faça commit do `.clasp.json`.
10. **Conferência:** envie um PDF como rascunho numa aula e confira se ele chegou à pasta
    "Sistema Cursinho" da conta nova. Exclua esse material depois.

Daqui em diante, para publicar código novo sem mudar a URL:
`npx clasp create-deployment -i <ID da implantação> -d "descrição"`.

## 5. cron-job.org (ping diário)

1. Recrie o job com a conta nova, seguindo [operacao.md](operacao.md#2-ping-diário-evita-a-pausa-do-supabase).
2. Confira um *Test run* com 200 e `"ok"`.
3. Apague o job antigo.

## 6. Dentro do app

1. Torne a conta da coordenação do cursinho **coordenação** (Pessoas → Ativas → papel). Se ainda
   não houver ninguém da coordenação, use o [runbook de primeira coordenação](operacao.md#1-primeira-pessoa-da-coordenação).
2. Desative a conta de quem desenvolveu (Pessoas → status *Inativo*), se não for mais usar.
3. Troque o e-mail de contato da LGPD em `src/lib/contato.ts` (`EMAIL_CONTATO_CURSINHO`), faça commit
   e push. **Conferência:** `/privacidade` mostra o e-mail novo.

## 7. Checklist final

- [ ] Supabase na organização do cursinho
- [ ] Repositório na organização do cursinho; app publicado na nova URL
- [ ] URLs atualizadas no Supabase e no Google Cloud; login com Google funcionando
- [ ] Google Cloud com o cursinho como Proprietário e e-mail de suporte trocado
- [ ] API de Arquivos na conta nova; upload testado
- [ ] Ping diário na conta nova
- [ ] Coordenação do cursinho com acesso; e-mail da LGPD em `/privacidade`
- [ ] Senhas e chaves guardadas no gerenciador de senhas do cursinho
