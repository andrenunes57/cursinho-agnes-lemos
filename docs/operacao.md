# Operação do sistema (runbooks)

Tarefas do dia a dia de quem cuida do sistema, explicadas passo a passo. Neste guia, "§" indica a
seção da [SPEC.md](../SPEC.md). As contas e os identificadores estão no §12.3.1.

| Quando | O que fazer | Seção |
|---|---|---|
| Uma vez, ao implantar | Definir a primeira pessoa da coordenação | [1](#1-primeira-pessoa-da-coordenação) |
| Uma vez, e conferir todo mês | Manter o ping diário no cron-job.org | [2](#2-ping-diário-evita-a-pausa-do-supabase) |
| Se o Supabase pausar | Restaurar o projeto | [3](#3-o-supabase-pausou) |
| Todo mês | Fazer o backup do banco | [4](#4-backup-mensal) |
| Ao ver o alerta de 80% | Liberar espaço no Drive | [5](#5-drive-cheio) |
| A pedido de alguém | Excluir os dados da pessoa (LGPD) | [6](#6-exclusão-de-dados-a-pedido-lgpd) |
| Se trocar a conta do Drive | Atualizar a URL da API de Arquivos | [7](#7-trocar-a-url-da-api-de-arquivos) |

---

## 1. Primeira pessoa da coordenação

Depois disso, todas as aprovações são feitas no próprio app.

1. A pessoa entra no app com o Google e preenche o primeiro acesso (nome social e aceite).
2. No **Supabase** → projeto `cursinho-agnes-lemos` → **SQL Editor**, rode (trocando o e-mail):

   ```sql
   update public.perfis set papel = 'coordenacao', status = 'ativo' where email = '<email>';
   ```

3. A pessoa recarrega o app e passa a ver o menu da coordenação (Pessoas, Turmas, Cronograma…).

## 2. Ping diário (evita a pausa do Supabase)

No plano gratuito, o Supabase **pausa projetos sem atividade por alguns dias**. Um acesso por dia
evita a pausa. Usamos o **cron-job.org** (gratuito). Agendamentos do GitHub Actions não servem,
porque o GitHub os desliga após 60 dias sem atividade no repositório.

### Criar o job (uma vez)

1. Entre em https://cron-job.org e crie uma conta (de preferência a conta Google do cursinho).
2. **Cronjobs → Create cronjob**:
   - **Title:** `Ping Supabase — Cursinho Agnes Lemos`
   - **URL:** `https://elxqckorrrwidoqgojfw.supabase.co/rest/v1/rpc/ping`
   - **Execution schedule:** *Every day*, num horário qualquer (ex.: 06:00), fuso
     `America/Sao_Paulo`.
3. Aba **Advanced**:
   - **Request method:** `GET`
   - **Headers → Add:** chave `apikey`, valor = a chave *publishable* do Supabase (a que está
     em `.env.production` no repositório, começando com `sb_publishable_`). Ela é pública.
     **Nunca** use a chave secreta (`sb_secret_…`).
   - **Notifications:** ligue *on failure* para receber um e-mail se o ping falhar.
4. Salve e clique em **Test run**. A resposta precisa ser **HTTP 200** com o corpo `"ok"`.

Para conferir pelo terminal:

```bash
curl -s "https://elxqckorrrwidoqgojfw.supabase.co/rest/v1/rpc/ping" -H "apikey: <chave publishable>"
# "ok"
```

### Conferir (todo mês)

No cron-job.org, o histórico do job deve mostrar uma execução por dia, todas com 200.

## 3. O Supabase pausou

Sinal: o app não carrega os dados, e o painel do Supabase mostra o projeto como *Paused*.

1. Com a conta dona do projeto, abra o **Dashboard do Supabase** → projeto → **Restore**.
2. Espere alguns minutos e recarregue o app.
3. Confira o ping (seção 2): ele precisa estar ligado.

Os dados são preservados, mas o Supabase tem um prazo máximo para restaurar pelo painel. Confira o
prazo atual na documentação do Supabase. Por isso, **não desligue o ping**.

## 4. Backup mensal

No computador de quem mantém o sistema (com o projeto configurado, veja [setup.md](setup.md)):

```bash
npx supabase db dump --linked -f backup-AAAA-MM.sql
npx supabase db dump --linked --data-only -f dados-AAAA-MM.sql
```

Guarde os dois arquivos no Drive do cursinho, numa **pasta restrita à coordenação**.
**Nunca** faça commit desses arquivos nem os envie para o GitHub: o repositório é público e os
arquivos contêm dados pessoais. Depois de guardar, apague-os do computador.

Os arquivos enviados (materiais e entregas) ficam no Google Drive da conta dona e não entram nesse
backup.

## 5. Drive cheio

**Coordenação → Armazenamento** mostra o uso do Drive. A partir de 80%, a página exibe um alerta.

Antes de chegar ao limite:

1. Na conta dona do Drive, esvazie a **lixeira** do Drive (os arquivos excluídos pelo app vão
   para lá e continuam ocupando espaço).
2. Em **Armazenamento → Arquivos órfãos**, exclua os órfãos (arquivos que nenhum material ou
   entrega usa).
3. Se a coordenação concordar, remova os materiais de turmas encerradas.

Se não bastar, crie uma **nova conta Gmail dedicada** e siga a linha "Apps Script + Drive" de
[transferencia-de-contas.md](transferencia-de-contas.md), com `CONTA_ID=drive-02` (ou o próximo
número). Os novos envios passam a ir para a nova conta. Os arquivos antigos continuam acessíveis
pelo link.

## 6. Exclusão de dados a pedido (LGPD)

Quando alguém pede para ter os dados excluídos:

1. Se a pessoa for docente, reatribua as aulas dela em **Coordenação → Cronograma** (editar aula →
   docente).
2. No **Supabase** → **Authentication → Users**, encontre o e-mail da pessoa → **Delete user**.
   A exclusão apaga junto o perfil, as matrículas, as entregas e as presenças.
3. Em **Coordenação → Armazenamento**, os arquivos que ela enviou aparecem como **órfãos** (após
   24 horas). Exclua-os.
4. Registre a data do atendimento fora do sistema (ex.: numa planilha da coordenação).

## 7. Trocar a URL da API de Arquivos

Só é preciso quando a API de Arquivos passa para outra conta Google (seção 5 ou transferência).

1. Na conta nova, implante a API (veja [transferencia-de-contas.md](transferencia-de-contas.md)).
2. No app, **Coordenação → Configurações**: cole a nova URL `/exec`, ajuste o rótulo da conta e
   salve.
3. Teste: numa aula, envie um PDF como rascunho e confira se ele aparece na pasta
   "Sistema Cursinho" da conta nova. Depois exclua esse material.
