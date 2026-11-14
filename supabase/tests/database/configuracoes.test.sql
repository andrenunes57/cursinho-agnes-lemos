-- configuracoes: leitura por pessoas ativas, escrita só da coordenação (SPEC §8.3, §9.3, RF-26)
begin;
\ir _fixtures.psql
select plan(10);

select testes.entrar_anon();
select throws_ok($$ select * from public.configuracoes $$, '42501', null, 'anon não lê configurações');
reset role;

select testes.entrar('pend');
select is_empty($$ select chave from public.configuracoes $$, 'pendente não lê configurações');
reset role;

select testes.entrar('est');
select set_eq($$ select chave from public.configuracoes $$, array['api_arquivos', 'limites'],
  'estudante ativa lê as chaves iniciais (0005)');
select results_eq($$ select valor from public.configuracoes where chave = 'limites' $$,
  $$ values ('{"max_mb": 15}'::jsonb) $$, 'limite inicial de 15 MB');
select is_empty($$ update public.configuracoes set valor = '{}' where chave = 'limites' returning chave $$,
  'estudante não edita configurações');
reset role;

select testes.entrar('prof');
select throws_ok($$ insert into public.configuracoes (chave, valor) values ('x', '{}') $$, '42501', null,
  'docente não cria configuração');
reset role;

select testes.entrar('coord');
select results_eq(
  $$ update public.configuracoes set valor = jsonb_set(valor, '{url}', '"https://script.google.com/x/exec"')
      where chave = 'api_arquivos' returning valor ->> 'url' $$,
  $$ values ('https://script.google.com/x/exec'::text) $$, 'coordenação troca a URL da API de Arquivos');
select ok((select atualizado_em = now() from public.configuracoes where chave = 'api_arquivos'),
  'atualizado_em mantido por trigger');
select results_eq($$ insert into public.configuracoes (chave, valor) values ('x', '{}') returning chave $$,
  $$ values ('x'::text) $$, 'coordenação cria configuração');
select results_eq($$ delete from public.configuracoes where chave = 'x' returning chave $$,
  $$ values ('x'::text) $$, 'coordenação exclui configuração');
reset role;

select * from finish();
rollback;
