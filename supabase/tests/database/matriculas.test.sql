-- matriculas: quem vê e quem escreve (SPEC §9.3, RF-07)
begin;
\ir _fixtures.psql
select plan(13);

select testes.entrar_anon();
select throws_ok($$ select * from public.matriculas $$, '42501', null, 'anon não lê matrículas');
reset role;

select testes.entrar('est');
select results_eq($$ select turma_id from public.matriculas $$, $$ values (testes.id('turma_a')) $$,
  'estudante vê só a própria matrícula');
select throws_ok(
  $$ insert into public.matriculas (estudante_id, turma_id) values (testes.id('est'), testes.id('turma_b')) $$,
  '42501', null, 'estudante não se matricula sozinha');
reset role;

select testes.entrar('inat');
select is_empty($$ select turma_id from public.matriculas $$, 'pessoa inativa não vê nem a própria matrícula');
reset role;

select testes.entrar('prof');
select set_eq($$ select estudante_id from public.matriculas $$, array[testes.id('est'), testes.id('inat')],
  'docente vê as matrículas das turmas onde leciona (e só delas)');
select throws_ok(
  $$ insert into public.matriculas (estudante_id, turma_id) values (testes.id('est2'), testes.id('turma_a')) $$,
  '42501', null, 'docente não matricula');
select is_empty($$ delete from public.matriculas where estudante_id = testes.id('est') returning 1 $$,
  'docente não desmatricula');
reset role;

select testes.entrar('prof2');
select set_eq($$ select estudante_id from public.matriculas $$, array[testes.id('est2')],
  'outra docente vê só a turma dela');
reset role;

select testes.entrar('coord');
select set_eq(
  $$ select estudante_id from public.matriculas
      where turma_id in (testes.id('turma_a'), testes.id('turma_b')) $$,
  array[testes.id('est'), testes.id('inat'), testes.id('est2')],
  'coordenação vê todas as matrículas'
);
select results_eq(
  $$ insert into public.matriculas (estudante_id, turma_id) values (testes.id('est2'), testes.id('turma_a'))
     returning estudante_id $$,
  $$ values (testes.id('est2')) $$, 'coordenação matricula');
select throws_ok(
  $$ update public.matriculas set turma_id = testes.id('turma_b') where estudante_id = testes.id('est') $$,
  '42501', null, 'matrícula não é editada (só criada ou excluída)');
select results_eq(
  $$ delete from public.matriculas where estudante_id = testes.id('est2') and turma_id = testes.id('turma_a')
     returning turma_id $$,
  $$ values (testes.id('turma_a')) $$, 'coordenação desmatricula');
reset role;

select testes.entrar('pend');
select is_empty($$ select turma_id from public.matriculas $$, 'pendente não vê matrículas');
reset role;

select * from finish();
rollback;
