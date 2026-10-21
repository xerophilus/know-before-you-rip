-- No speculative card identities, prices, odds or pull confirmations are seeded.
create table public.admin_roles (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.releases (id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null);
insert into public.releases(slug,title) values ('2025-26-topps-chrome-black-basketball','2025–26 Topps Chrome Black Basketball');
create table public.source_documents (
 id uuid primary key default gen_random_uuid(), release_id uuid not null references public.releases,
 source_url text not null check(source_url ~ '^https://'), publisher text not null,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'), filename text not null,
 media_type text not null check(media_type in ('text/csv','application/pdf')),
 extracted jsonb not null, captured_at timestamptz not null default now(),
 verified_by uuid references auth.users, verified_at timestamptz,
 unique(release_id,sha256), check ((verified_by is null) = (verified_at is null))
);
create table public.checklist_imports (
 id uuid primary key default gen_random_uuid(), source_id uuid not null unique references public.source_documents,
 rows jsonb not null check(jsonb_typeof(rows)='array' and jsonb_array_length(rows)>0),
 status text not null default 'staged' check(status in ('staged','published')),
 created_by uuid not null references auth.users, created_at timestamptz not null default now(), published_at timestamptz
);
create table public.card_sets (id uuid primary key default gen_random_uuid(), release_id uuid not null references public.releases, name text not null, unique(release_id,name));
create table public.cards (id uuid primary key default gen_random_uuid(), set_id uuid not null references public.card_sets, card_number text not null, subject text not null, unique(set_id,card_number));
create table public.parallels (id uuid primary key default gen_random_uuid(), card_id uuid not null references public.cards, name text not null, print_run integer check(print_run between 1 and 1000000), unique(card_id,name));
create unique index card_sets_identity on public.card_sets(release_id,lower(btrim(name)));
create unique index cards_identity on public.cards(set_id,lower(btrim(card_number)));
create unique index parallels_identity on public.parallels(card_id,lower(btrim(name)));
create table public.checklist_provenance (
 parallel_id uuid not null references public.parallels, source_id uuid not null references public.source_documents,
 locator text not null, imported_at timestamptz not null default now(), primary key(parallel_id,source_id,locator)
);
create table public.serialized_copies (
 id uuid primary key default gen_random_uuid(), parallel_id uuid not null references public.parallels,
 serial_number integer not null check(serial_number>0), unique(parallel_id,serial_number)
);
create table public.evidence_submissions (
 id uuid primary key default gen_random_uuid(), submitter_id uuid not null references auth.users,
 parallel_id uuid not null references public.parallels, serial_number integer not null check(serial_number>0),
 source_url text not null check(source_url ~ '^https://' and length(source_url)<=2048),
 locator text not null check(length(locator) between 3 and 500), note text not null default '' check(length(note)<=2000),
 observed_at timestamptz not null check(observed_at <= now()), created_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','approved','rejected','revoked')),
 unique(submitter_id,parallel_id,serial_number,source_url)
);
create table public.sightings (
 id uuid primary key default gen_random_uuid(), copy_id uuid not null references public.serialized_copies,
 submission_id uuid not null unique references public.evidence_submissions,
 source_url text not null, locator text not null, observed_at timestamptz not null,
 reviewed_at timestamptz not null default now()
);
create table public.review_events (
 id uuid primary key default gen_random_uuid(), submission_id uuid not null references public.evidence_submissions,
 reviewer_id uuid not null references auth.users, decision text not null check(decision in ('approved','rejected','revoked')),
 reason text not null check(length(trim(reason)) between 10 and 2000), created_at timestamptz not null default now()
);
create index on public.card_sets(release_id);
create index on public.cards(set_id);
create index on public.parallels(card_id);
create index on public.sightings(copy_id);
create index on public.evidence_submissions(submitter_id,created_at);
create index on public.evidence_submissions(status,created_at);
create index on public.review_events(submission_id);
create index on public.checklist_provenance(source_id);

-- Both inserts from the API and direct Data API calls enforce the denominator.
create function public.check_serial() returns trigger language plpgsql security invoker set search_path='' as $$
declare run integer;
begin
 select print_run into run from public.parallels where id=new.parallel_id;
 if run is null or new.serial_number>run or new.serial_number<1 then raise exception 'Serial outside verified print run'; end if;
 return new;
end $$;
create trigger validate_submission before insert or update on public.evidence_submissions for each row execute function public.check_serial();
create trigger validate_copy before insert or update on public.serialized_copies for each row execute function public.check_serial();

-- Privileged operations are server-only, invoker functions; no SECURITY DEFINER bypass.
create function public.review_evidence(submission uuid, reviewer uuid, decision text, reason text)
returns void language plpgsql security invoker set search_path='' as $$
declare entry public.evidence_submissions; copy uuid;
begin
 if not exists(select 1 from public.admin_roles where user_id=reviewer) then raise exception 'Reviewer required'; end if;
 if decision not in ('approved','rejected','revoked') or length(trim(reason)) not between 10 and 2000 then raise exception 'Invalid review'; end if;
 select * into strict entry from public.evidence_submissions where id=submission for update;
 if (entry.status<>'pending' and not(entry.status='approved' and decision='revoked')) or (entry.status='pending' and decision='revoked') then raise exception 'Invalid transition'; end if;
 if decision='approved' then
   insert into public.serialized_copies(parallel_id,serial_number) values(entry.parallel_id,entry.serial_number)
     on conflict(parallel_id,serial_number) do update set serial_number=excluded.serial_number returning id into copy;
   insert into public.sightings(copy_id,submission_id,source_url,locator,observed_at)
     values(copy,submission,entry.source_url,entry.locator,entry.observed_at);
 elsif decision='revoked' then delete from public.sightings where submission_id=submission;
 end if;
 update public.evidence_submissions set status=decision where id=submission;
 insert into public.review_events(submission_id,reviewer_id,decision,reason) values(submission,reviewer,decision,trim(reason));
end $$;

create function public.stage_checklist(actor uuid,payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare source uuid; result uuid;
begin
 if not exists(select 1 from public.admin_roles where user_id=actor) then raise exception 'Reviewer required'; end if;
 insert into public.source_documents(release_id,source_url,publisher,sha256,filename,media_type,extracted)
 values((payload->>'releaseId')::uuid,payload->>'sourceUrl',payload->>'publisher',payload->>'sha256',payload->>'filename',payload->>'mediaType',payload->'extracted') returning id into source;
 insert into public.checklist_imports(source_id,rows,created_by) values(source,payload->'rows',actor) returning id into result;
 return result;
end $$;
create function public.publish_checklist(import_id uuid,actor uuid) returns void language plpgsql security invoker set search_path='' as $$
declare batch public.checklist_imports; doc public.source_documents; row jsonb; setid uuid; cardid uuid; parallelid uuid; oldrun integer; oldsubject text;
begin
 if not exists(select 1 from public.admin_roles where user_id=actor) then raise exception 'Reviewer required'; end if;
 select * into strict batch from public.checklist_imports where id=import_id for update;
 if batch.status<>'staged' then raise exception 'Already published'; end if;
 select * into strict doc from public.source_documents where id=batch.source_id;
 -- Serialize imports for a release, including conflicting parallel denominators.
 perform 1 from public.releases where id=doc.release_id for update;
 for row in select value from jsonb_array_elements(batch.rows) loop
   if coalesce(trim(row->>'set'),'')='' or coalesce(trim(row->>'card_number'),'')='' or coalesce(trim(row->>'subject'),'')='' or coalesce(trim(row->>'parallel'),'')='' or coalesce(trim(row->>'locator'),'')='' then raise exception 'Missing identity or provenance'; end if;
   insert into public.card_sets(release_id,name) values(doc.release_id,row->>'set') on conflict(release_id,(lower(btrim(name)))) do update set name=card_sets.name returning id into setid;
   insert into public.cards(set_id,card_number,subject) values(setid,row->>'card_number',row->>'subject') on conflict(set_id,(lower(btrim(card_number)))) do nothing;
   select id,subject into cardid,oldsubject from public.cards where set_id=setid and lower(btrim(card_number))=lower(btrim(row->>'card_number'));
   if lower(btrim(oldsubject))<>lower(btrim(row->>'subject')) then raise exception 'Card subject conflict'; end if;
   insert into public.parallels(card_id,name,print_run) values(cardid,row->>'parallel',(row->>'print_run')::integer) on conflict(card_id,(lower(btrim(name)))) do nothing;
   select id,print_run into parallelid,oldrun from public.parallels where card_id=cardid and lower(btrim(name))=lower(btrim(row->>'parallel'));
   if oldrun is distinct from (row->>'print_run')::integer then raise exception 'Print run conflict'; end if;
   insert into public.checklist_provenance(parallel_id,source_id,locator) values(parallelid,doc.id,row->>'locator') on conflict do nothing;
 end loop;
 update public.source_documents set verified_at=now(),verified_by=actor where id=doc.id;
 update public.checklist_imports set status='published',published_at=now() where id=import_id;
end $$;

-- Explicit grants: never inherit broad default privileges from a hosted project.
alter table public.releases enable row level security;
revoke all on public.releases from public,anon,authenticated;
grant all on public.releases to service_role;
alter table public.card_sets enable row level security;
revoke all on public.card_sets from public,anon,authenticated;
grant all on public.card_sets to service_role;
alter table public.cards enable row level security;
revoke all on public.cards from public,anon,authenticated;
grant all on public.cards to service_role;
alter table public.parallels enable row level security;
revoke all on public.parallels from public,anon,authenticated;
grant all on public.parallels to service_role;
alter table public.checklist_provenance enable row level security;
revoke all on public.checklist_provenance from public,anon,authenticated;
grant all on public.checklist_provenance to service_role;
alter table public.sightings enable row level security;
revoke all on public.sightings from public,anon,authenticated;
grant all on public.sightings to service_role;
alter table public.admin_roles enable row level security;
revoke all on public.admin_roles from public,anon,authenticated;
grant all on public.admin_roles to service_role;
alter table public.source_documents enable row level security;
revoke all on public.source_documents from public,anon,authenticated;
grant all on public.source_documents to service_role;
alter table public.checklist_imports enable row level security;
revoke all on public.checklist_imports from public,anon,authenticated;
grant all on public.checklist_imports to service_role;
alter table public.evidence_submissions enable row level security;
revoke all on public.evidence_submissions from public,anon,authenticated;
grant all on public.evidence_submissions to service_role;
alter table public.review_events enable row level security;
revoke all on public.review_events from public,anon,authenticated;
grant all on public.review_events to service_role;
alter table public.serialized_copies enable row level security;
revoke all on public.serialized_copies from public,anon,authenticated;
grant all on public.serialized_copies to service_role;
grant select on public.releases to anon,authenticated;
create policy public_read on public.releases for select to anon,authenticated using(true);
grant select on public.card_sets to anon,authenticated;
create policy public_read on public.card_sets for select to anon,authenticated using(true);
grant select on public.cards to anon,authenticated;
create policy public_read on public.cards for select to anon,authenticated using(true);
grant select on public.parallels to anon,authenticated;
create policy public_read on public.parallels for select to anon,authenticated using(true);
grant select on public.checklist_provenance to anon,authenticated;
create policy public_read on public.checklist_provenance for select to anon,authenticated using(true);
grant select on public.sightings to anon,authenticated;
create policy public_read on public.sightings for select to anon,authenticated using(true);

create policy reviewer_read on public.source_documents for select to authenticated using(exists(select 1 from public.admin_roles where user_id=(select auth.uid())));
grant select on public.checklist_imports to authenticated;
create policy reviewer_read on public.checklist_imports for select to authenticated using(exists(select 1 from public.admin_roles where user_id=(select auth.uid())));
grant select on public.review_events to authenticated;
create policy reviewer_read on public.review_events for select to authenticated using(exists(select 1 from public.admin_roles where user_id=(select auth.uid())));
grant select on public.admin_roles to authenticated;
create policy own_role on public.admin_roles for select to authenticated using(user_id=(select auth.uid()));
grant select on public.evidence_submissions to authenticated;
grant insert(submitter_id,parallel_id,serial_number,source_url,locator,note,observed_at) on public.evidence_submissions to authenticated;
create policy submission_read on public.evidence_submissions for select to authenticated using(submitter_id=(select auth.uid()) or exists(select 1 from public.admin_roles where user_id=(select auth.uid())));
create policy submission_create on public.evidence_submissions for insert to authenticated with check(submitter_id=(select auth.uid()) and status='pending' and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
grant select on public.serialized_copies to anon,authenticated;
create policy sighted_copy on public.serialized_copies for select to anon,authenticated using(exists(select 1 from public.sightings where copy_id=serialized_copies.id));
revoke all on function public.review_evidence(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.review_evidence(uuid,uuid,text,text) to service_role;
revoke all on function public.stage_checklist(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.stage_checklist(uuid,jsonb) to service_role;
revoke all on function public.publish_checklist(uuid,uuid) from public,anon,authenticated;
grant execute on function public.publish_checklist(uuid,uuid) to service_role;
revoke all on function public.check_serial() from public,anon,authenticated;
grant execute on function public.check_serial() to service_role;

create view public.catalog with(security_invoker=true) as
select p.id,p.name as parallel,p.print_run,c.subject,c.card_number,s.name as set_name,r.slug as release_slug,
 (select count(distinct x.id)::integer from public.serialized_copies x join public.sightings si on si.copy_id=x.id where x.parallel_id=p.id) as copies_seen
from public.parallels p join public.cards c on c.id=p.card_id join public.card_sets s on s.id=c.set_id join public.releases r on r.id=s.release_id;
revoke all on public.catalog from public,anon,authenticated;
grant select on public.catalog to anon,authenticated,service_role;
-- Public provenance contains no reviewer identities or extracted private source text.
create view public.official_sources with(security_invoker=true) as
select id,source_url,publisher,sha256,media_type,captured_at,verified_at from public.source_documents where verified_at is not null;
-- Column grants let this invoker view expose verified provenance, without exposing original extraction or reviewer identity.
grant select(id,source_url,publisher,sha256,media_type,captured_at,verified_at) on public.source_documents to anon,authenticated;
create policy verified_source_read on public.source_documents for select to anon,authenticated using(verified_at is not null);
revoke all on public.official_sources from public,anon,authenticated;
grant select on public.official_sources to anon,authenticated,service_role;
