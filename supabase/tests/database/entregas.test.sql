-- entregas: leitura por policy; escrita só pelas RPCs (SPEC §5.6, §9.1, §9.3, RF-16–RF-19)
begin;
\ir _fixtures.psql
select plan(12);

select testes.entrar_anon();
select throws_ok($$ select * from public.entregas $$, '42501', null, 'anon não lê entregas');
reset role;

-- SELECT -------------------------------------------------------------------------------------------
select testes.entrar('est');
select results_eq($$ select id from public.entregas $$, $$ values (testes.id('ent_est')) $$,
  'estudante vê a própria entrega');
reset role;

select testes.entrar('est2');
select is_empty($$ select id from public.entregas $$, 'outra estudante não vê a entrega');
reset role;

select testes.entrar('prof');
select results_eq($$ select id from public.entregas $$, $$ values (testes.id('ent_est')) $$,
  'docente da aula vê as entregas das próprias tarefas');
reset role;

select testes.entrar('prof2');
select is_empty($$ select id from public.entregas $$, 'outra docente não vê a entrega');
reset role;

select testes.entrar('coord');
select results_eq($$ select id from public.entregas $$, $$ values (testes.id('ent_est')) $$,
  'coordenação vê todas as entregas');
reset role;

-- Ex-estudante desligada não vê mais nem a própria entrega (RF-03).
update public.perfis set status = 'inativo' where id = testes.id('est');
select testes.entrar('est');
select is_empty($$ select id from public.entregas $$, 'estudante inativa não vê entregas');
reset role;
update public.perfis set status = 'ativo' where id = testes.id('est');

-- Escrita direta recusada (só RPC) -----------------------------------------------------------------
select testes.entrar('est');
select throws_ok(
  $$ insert into public.entregas (tarefa_id, estudante_id, comentario) values (testes.id('tar_conceito'), testes.id('est'), 'Oi') $$,
  '42501', null, 'estudante não insere entrega direto na tabela');
select throws_ok($$ update public.entregas set comentario = 'Editado' where id = testes.id('ent_est') $$,
  '42501', null, 'estudante não edita entrega direto na tabela');
reset role;

select testes.entrar('prof');
select throws_ok($$ update public.entregas set nota = 10, avaliada_em = now() where id = testes.id('ent_est') $$,
  '42501', null, 'docente não avalia direto na tabela');
reset role;

select testes.entrar('coord');
select throws_ok($$ delete from public.entregas where id = testes.id('ent_est') $$,
  '42501', null, 'coordenação não exclui entrega pela API');
select throws_ok($$ update public.entregas set nota = 10 where id = testes.id('ent_est') $$,
  '42501', null, 'coordenação não altera nota');
reset role;

select * from finish();
rollback;
