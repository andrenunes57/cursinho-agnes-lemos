-- turmas: leitura por pessoas ativas, escrita só da coordenação (SPEC §9.3, RF-07)
begin;
\ir _fixtures.psql
select plan(12);

select testes.entrar_anon();
select throws_ok($$ select * from public.turmas $$, '42501', null, 'anon não lê turmas');
reset role;

select testes.entrar('pend');
select is_empty($$ select id from public.turmas $$, 'pendente não lê turmas');
reset role;

select testes.entrar('inat');
select is_empty($$ select id from public.turmas $$, 'inativa não lê turmas');
reset role;

select testes.entrar('est');
select ok(exists (select 1 from public.turmas where id = testes.id('turma_b')), 'estudante ativa lê turmas');
select throws_ok($$ insert into public.turmas (nome, ano) values ('X', 2027) $$, '42501', null, 'estudante não cria turma');
select is_empty($$ update public.turmas set nome = 'X' where id = testes.id('turma_a') returning id $$, 'estudante não edita turma');
select is_empty($$ delete from public.turmas where id = testes.id('turma_a') returning id $$, 'estudante não exclui turma');
reset role;

select testes.entrar('prof');
select throws_ok($$ insert into public.turmas (nome, ano) values ('X', 2027) $$, '42501', null, 'docente não cria turma');
reset role;

select testes.entrar('coord');
select results_eq($$ insert into public.turmas (nome, ano) values ('Turma 2028', 2028) returning nome $$,
  $$ values ('Turma 2028'::text) $$, 'coordenação cria turma');
select results_eq($$ update public.turmas set ativa = false where id = testes.id('turma_b') returning ativa $$,
  $$ values (false) $$, 'coordenação desativa turma');
select results_eq($$ delete from public.turmas where id = testes.id('turma_inativa') returning nome $$,
  $$ values ('Turma Encerrada'::text) $$, 'coordenação exclui turma');
select ok(exists (select 1 from public.turmas where id = testes.id('turma_b')), 'coordenação lê turmas');
reset role;

select * from finish();
rollback;
