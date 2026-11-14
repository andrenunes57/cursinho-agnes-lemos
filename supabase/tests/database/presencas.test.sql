-- presencas: leitura por policy; escrita só pela RPC registrar_chamada (SPEC §9.1, §9.3, RF-20–RF-22)
begin;
\ir _fixtures.psql
select plan(11);

select testes.entrar_anon();
select throws_ok($$ select * from public.presencas $$, '42501', null, 'anon não lê presenças');
reset role;

-- SELECT -------------------------------------------------------------------------------------------
select testes.entrar('est');
select results_eq($$ select aula_id, status::text from public.presencas $$,
  $$ values (testes.id('aula_passada'), 'presente'::text) $$, 'estudante vê a própria presença');
reset role;

select testes.entrar('est2');
select results_eq($$ select aula_id from public.presencas $$, $$ values (testes.id('aula_b')) $$,
  'outra estudante vê só a própria presença');
reset role;

select testes.entrar('prof');
select results_eq($$ select estudante_id from public.presencas $$, $$ values (testes.id('est')) $$,
  'docente vê as presenças das próprias aulas');
reset role;

select testes.entrar('prof2');
select results_eq($$ select estudante_id from public.presencas $$, $$ values (testes.id('est2')) $$,
  'outra docente vê só as presenças das aulas dela');
reset role;

select testes.entrar('coord');
select results_eq($$ select count(*)::int from public.presencas $$, $$ values (2) $$,
  'coordenação vê todas as presenças');
reset role;

select testes.entrar('pend');
select is_empty($$ select aula_id from public.presencas $$, 'pendente não vê presenças');
reset role;

-- Escrita direta recusada --------------------------------------------------------------------------
select testes.entrar('prof');
select throws_ok(
  $$ insert into public.presencas (aula_id, estudante_id, status, registrado_por)
     values (testes.id('aula_passada'), testes.id('inat'), 'ausente', testes.id('prof')) $$,
  '42501', null, 'docente não insere presença direto na tabela');
select throws_ok(
  $$ update public.presencas set status = 'ausente' where estudante_id = testes.id('est') $$,
  '42501', null, 'docente não altera presença direto na tabela');
reset role;

select testes.entrar('est');
select throws_ok($$ update public.presencas set status = 'justificada' $$, '42501', null,
  'estudante não altera a própria presença');
reset role;

select testes.entrar('coord');
select throws_ok($$ delete from public.presencas $$, '42501', null, 'coordenação não exclui presenças');
reset role;

select * from finish();
rollback;
