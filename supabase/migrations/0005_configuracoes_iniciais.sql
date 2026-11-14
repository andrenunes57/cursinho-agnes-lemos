-- F1 · 0005 — Configurações iniciais (SPEC §8.3 configuracoes, RF-26)
-- A URL da API de Arquivos é preenchida na F4 (pela tela /coordenacao/configuracoes ou por SQL).
insert into public.configuracoes (chave, valor) values
  ('api_arquivos', '{"url": "", "conta": "drive-01"}'::jsonb),
  ('limites', '{"max_mb": 15}'::jsonb)
on conflict (chave) do nothing;
