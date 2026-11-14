-- Seed do stack LOCAL (roda no `supabase db reset`; o `db push` não aplica seed).
-- Só dados de exemplo, sem pessoas reais (SPEC §6.4, §13 F1).
insert into public.turmas (nome, ano) values ('Turma 2027', 2027);

insert into public.disciplinas (nome) values
  ('Matemática'),
  ('Português'),
  ('Redação'),
  ('História'),
  ('Geografia'),
  ('Biologia'),
  ('Química'),
  ('Física')
on conflict (nome) do nothing;
