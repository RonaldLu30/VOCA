alter table public.vocabulary_lists
add column if not exists day_number integer;

with numbered as (
  select id, row_number() over (partition by user_id order by created_at, id) as day_number
  from public.vocabulary_lists
  where day_number is null
)
update public.vocabulary_lists as lists
set day_number = numbered.day_number
from numbered
where lists.id = numbered.id;

alter table public.vocabulary_lists
alter column day_number set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vocabulary_lists_day_number_positive'
  ) then
    alter table public.vocabulary_lists
    add constraint vocabulary_lists_day_number_positive check (day_number > 0);
  end if;
end;
$$;

create index if not exists vocabulary_lists_user_day_idx
on public.vocabulary_lists (user_id, day_number);
