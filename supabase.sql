-- Laryngoskop / EKG-Quiz – Datenbank. Kann mehrfach ausgeführt werden.
-- Vor dem Ausführen unten HIER-PIN durch eine eigene PIN ersetzen.

create table if not exists public.antworten (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  runde      text not null,
  geraet     text not null,
  frage      int  not null,
  antwort    jsonb not null,
  richtig    boolean,
  unique (runde, geraet, frage)
);
alter table public.antworten enable row level security;

create table if not exists public.steuerung (
  runde      text primary key,
  frage      int  not null default 0,          -- 0 = Warten
  aufgeloest boolean not null default false,
  reset_nr   int  not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.steuerung enable row level security;
drop policy if exists "lesen" on public.steuerung;
create policy "lesen" on public.steuerung for select to anon using (true);

create table if not exists public.einstellungen (schluessel text primary key, wert text not null);
alter table public.einstellungen enable row level security;   -- keine Policy: öffentlich nicht lesbar
insert into public.einstellungen values ('pin', 'HIER-PIN')
  on conflict (schluessel) do update set wert = excluded.wert;

-- Publikum darf nur schreiben – im Live-Modus nur zur gerade freigegebenen, noch nicht aufgelösten Frage
drop policy if exists "nur einfuegen" on public.antworten;
create policy "nur einfuegen" on public.antworten for insert to anon with check (
  length(geraet) between 8 and 64 and length(runde) <= 40 and (
    not exists (select 1 from public.steuerung s where s.runde = antworten.runde)
    or exists (select 1 from public.steuerung s where s.runde = antworten.runde and s.frage = antworten.frage and not s.aufgeloest)));

-- Ergebnisseite: nur Summen
create or replace function public.ergebnis(p_runde text)
returns table (frage int, antwort jsonb, richtig boolean, anzahl bigint)
language sql security definer set search_path = public as $$
  select frage, antwort, richtig, count(*) from antworten where runde = p_runde group by frage, antwort, richtig
$$;

create or replace function public.pin_ok(p_pin text) returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from einstellungen where schluessel = 'pin' and wert = p_pin)
$$;

create or replace function public.steuern(p_runde text, p_frage int, p_aufgeloest boolean, p_pin text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not pin_ok(p_pin) then raise exception 'falsche PIN'; end if;
  insert into steuerung (runde, frage, aufgeloest) values (p_runde, p_frage, p_aufgeloest)
  on conflict (runde) do update set frage = excluded.frage, aufgeloest = excluded.aufgeloest, updated_at = now();
end $$;

create or replace function public.zuruecksetzen(p_runde text, p_pin text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not pin_ok(p_pin) then raise exception 'falsche PIN'; end if;
  delete from antworten where runde = p_runde;
  insert into steuerung (runde) values (p_runde)
  on conflict (runde) do update set frage = 0, aufgeloest = false, reset_nr = steuerung.reset_nr + 1, updated_at = now();
end $$;

grant execute on function public.ergebnis(text), public.pin_ok(text),
  public.steuern(text, int, boolean, text), public.zuruecksetzen(text, text) to anon;
