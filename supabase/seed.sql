-- Starter clubs. Logos are added in Phase 3 (Storage upload or logo_url).
insert into teams (name, short_name) values
  ('FC Barcelona',      'BAR'),
  ('Liverpool',         'LIV'),
  ('Real Madrid',       'RMA'),
  ('Arsenal',           'ARS'),
  ('Manchester City',   'MCI'),
  ('Bayern Munich',     'BAY'),
  ('Chelsea',           'CHE'),
  ('Manchester United', 'MUN'),
  ('Inter Milan',       'INT'),
  ('AC Milan',          'MIL'),
  ('Paris Saint-Germain','PSG'),
  ('Juventus',          'JUV')
on conflict do nothing;
