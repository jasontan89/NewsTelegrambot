create or replace function hs_weekly_completion_rate(p_habit_id uuid, p_weeks int default 12)
returns table(week_start date, completion_rate numeric)
language sql stable as $$
  select date_trunc('week', log_date)::date,
         count(*) filter (where completed or value is not null)::numeric / 7
  from hs_habit_logs
  where habit_id = p_habit_id
    and user_id = (select auth.uid())
    and log_date >= current_date - (p_weeks * 7)
  group by 1
  order by 1;
$$;

create or replace function hs_stack_cohesion_score(p_stack_id uuid, p_days int default 30)
returns numeric
language plpgsql stable as $$
declare
  total_days int;
  cohesive_days int;
  habit_count int;
begin
  select count(*) into habit_count from hs_stack_habits where stack_id = p_stack_id;
  
  if habit_count = 0 then
    return 0;
  end if;

  select count(distinct log_date) into total_days
  from hs_habit_logs
  where user_id = (select auth.uid())
    and log_date >= current_date - p_days
    and habit_id in (select habit_id from hs_stack_habits where stack_id = p_stack_id);

  if total_days = 0 then
    return 0;
  end if;

  select count(*) into cohesive_days
  from (
    select log_date, count(*) as completed_count
    from hs_habit_logs
    where user_id = (select auth.uid())
      and log_date >= current_date - p_days
      and habit_id in (select habit_id from hs_stack_habits where stack_id = p_stack_id)
      and (completed = true or value is not null)
    group by log_date
  ) daily_logs
  where completed_count = habit_count;

  return (cohesive_days::numeric / total_days::numeric) * 100;
end;
$$;
