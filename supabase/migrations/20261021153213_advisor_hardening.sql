-- Cover foreign keys flagged by the performance advisor.
create index if not exists checklist_imports_created_by_idx on public.checklist_imports(created_by);
create index if not exists evidence_submissions_parallel_id_idx on public.evidence_submissions(parallel_id);
create index if not exists review_events_reviewer_id_idx on public.review_events(reviewer_id);
create index if not exists source_documents_verified_by_idx on public.source_documents(verified_by);

-- Supabase's auto-RLS event trigger function is not an API surface.
do $$ begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='rls_auto_enable') then
   revoke all on function public.rls_auto_enable() from public,anon,authenticated;
 end if;
end $$;
