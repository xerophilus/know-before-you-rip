-- Fixed-window counters shared by every server instance. Server-only: no browser role can read or reset them.
create table public.rate_limits (
 bucket text primary key check(length(bucket) between 1 and 200),
 window_start timestamptz not null,
 hits integer not null
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public,anon,authenticated;
grant all on public.rate_limits to service_role;

create function public.rate_limit_hit(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare total integer;
begin
 if p_max < 1 or p_window_seconds < 1 then raise exception 'Invalid rate limit'; end if;
 insert into public.rate_limits as r(bucket,window_start,hits) values(p_bucket,now(),1)
 on conflict(bucket) do update set
   window_start = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then now() else r.window_start end,
   hits = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end
 returning hits into total;
 -- Occasionally drop counters idle for more than a day.
 if random() < 0.01 then delete from public.rate_limits where window_start < now() - interval '1 day'; end if;
 return total <= p_max;
end $$;
revoke all on function public.rate_limit_hit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.rate_limit_hit(text,integer,integer) to service_role;
