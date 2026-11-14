-- perfis: trigger de criação, backfill, leitura e edição restrita (SPEC §8.3, §9.3, RF-02–RF-04)
begin;
\ir _fixtures.psql
select plan(19);

-- Trigger on_auth_user_created: só (id, email), nunca nome/foto do Google ------------------------
insert into auth.users (id, email, aud, role, raw_user_meta_data) values (
  '99999999-0000-4000-8000-000000000001', 'novo@teste.local', 'authenticated', 'authenticated',
  '{"full_name":"Nome Civil Google","name":"Nome Civil","avatar_url":"https://exemplo.invalid/foto.png"}'
);
select results_eq(
  $$ select email, nome_social, pronomes, papel::text, status::text, consentimento_em
       from public.perfis where id = '99999999-0000-4000-8000-000000000001' $$,
  $$ values ('novo@teste.local'::text, null::text, null::text, 'estudante'::text, 'pendente'::text, null::timestamptz) $$,
  'trigger cria perfil só com id e e-mail (pendente, estudante, sem nome do Google)'
);
select hasnt_column('public', 'perfis', 'avatar_url', 'perfis não guarda foto');
select hasnt_column('public', 'perfis', 'full_name', 'perfis não guarda nome do Google');

-- Backfill (0002): recria perfis faltantes e é idempotente ------------------------------------------
delete from public.perfis where id = '99999999-0000-4000-8000-000000000001';
insert into public.perfis (id, email)
select u.id, u.email from auth.users u where u.email is not null
on conflict (id) do nothing;
select results_eq(
  $$ select count(*)::int from public.perfis where id = '99999999-0000-4000-8000-000000000001' $$,
  $$ values (1) $$,
  'backfill recria o perfil faltante'
);
select results_eq(
  $$ select nome_social from public.perfis where id = testes.id('est') $$,
  $$ values ('Est Teste'::text) $$,
  'backfill não sobrescreve perfil existente'
);

-- anon ---------------------------------------------------------------------------------------------
select testes.entrar_anon();
select throws_ok($$ select * from public.perfis $$, '42501', null, 'anon não lê perfis');
reset role;

-- SELECT -------------------------------------------------------------------------------------------
select testes.entrar('est');
select results_eq($$ select id from public.perfis $$, $$ values (testes.id('est')) $$,
  'estudante vê só o próprio perfil');
reset role;

select testes.entrar('prof');
select results_eq($$ select id from public.perfis $$, $$ values (testes.id('prof')) $$,
  'docente vê só o próprio perfil (estudantes via RPC)');
reset role;

select testes.entrar('pend');
select results_eq($$ select id from public.perfis $$, $$ values (testes.id('pend')) $$,
  'pendente vê o próprio perfil');
reset role;

select testes.entrar('coord');
select results_eq($$ select count(*)::int from public.perfis $$, $$ values (8) $$,
  'coordenação vê todos os perfis');
reset role;

-- UPDATE -------------------------------------------------------------------------------------------
select testes.entrar('pend');
select results_eq(
  $$ update public.perfis set nome_social = 'Ana', pronomes = 'ela/dela', consentimento_em = now()
      where id = testes.id('pend') returning nome_social, pronomes $$,
  $$ values ('Ana'::text, 'ela/dela'::text) $$,
  'pessoa pendente conclui o onboarding (nome social, pronomes, consentimento)'
);
select throws_ok($$ update public.perfis set papel = 'coordenacao' where id = testes.id('pend') $$,
  '42501', null, 'não altera o próprio papel');
select throws_ok($$ update public.perfis set status = 'ativo' where id = testes.id('pend') $$,
  '42501', null, 'não altera o próprio status');
select throws_ok($$ update public.perfis set email = 'x@y.z' where id = testes.id('pend') $$,
  '42501', null, 'não altera o próprio e-mail');
select is_empty(
  $$ update public.perfis set nome_social = 'Invasão' where id = testes.id('est') returning id $$,
  'não altera o perfil de outra pessoa'
);
select throws_ok($$ update public.perfis set nome_social = 'A' where id = testes.id('pend') $$,
  '23514', null, 'nome social com menos de 2 caracteres é recusado');
select throws_ok($$ update public.perfis set pronomes = repeat('x', 31) where id = testes.id('pend') $$,
  '23514', null, 'pronomes com mais de 30 caracteres são recusados');
reset role;

-- INSERT/DELETE: só trigger e runbook --------------------------------------------------------------
select testes.entrar('coord');
select throws_ok($$ insert into public.perfis (id, email) values (gen_random_uuid(), 'x@y.z') $$,
  '42501', null, 'ninguém insere perfil pela API (nem a coordenação)');
select throws_ok($$ delete from public.perfis where id = testes.id('pend') $$,
  '42501', null, 'ninguém exclui perfil pela API (runbook LGPD)');
reset role;

select * from finish();
rollback;
