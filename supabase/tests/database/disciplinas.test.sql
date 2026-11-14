-- disciplinas: leitura por pessoas ativas, escrita só da coordenação (SPEC §9.3, RF-08)
begin;
\ir _fixtures.psql
select plan(10);

select testes.entrar_anon();
select throws_ok($$ select * from public.disciplinas $$, '42501', null, 'anon não lê disciplinas');
reset role;

select testes.entrar('pend');
select is_empty($$ select id from public.disciplinas $$, 'pendente não lê disciplinas');
reset role;

select testes.entrar('est');
select ok(exists (select 1 from public.disciplinas where id = testes.id('disciplina')), 'estudante ativa lê disciplinas');
select throws_ok($$ insert into public.disciplinas (nome) values ('Filosofia') $$, '42501', null, 'estudante não cria disciplina');
reset role;

select testes.entrar('prof');
select throws_ok($$ insert into public.disciplinas (nome) values ('Filosofia') $$, '42501', null, 'docente não cria disciplina');
select is_empty($$ update public.disciplinas set ativa = false where id = testes.id('disciplina') returning id $$,
  'docente não desativa disciplina');
reset role;

select testes.entrar('coord');
select results_eq($$ insert into public.disciplinas (nome) values ('Filosofia') returning nome $$,
  $$ values ('Filosofia'::text) $$, 'coordenação cria disciplina');
select throws_ok($$ insert into public.disciplinas (nome) values ('Filosofia') $$, '23505', null, 'nome de disciplina é único');
select results_eq($$ update public.disciplinas set ativa = false where id = testes.id('disciplina') returning ativa $$,
  $$ values (false) $$, 'coordenação desativa disciplina');
select results_eq($$ delete from public.disciplinas where nome = 'Filosofia' returning nome $$,
  $$ values ('Filosofia'::text) $$, 'coordenação exclui disciplina sem aulas');
reset role;

select * from finish();
rollback;
