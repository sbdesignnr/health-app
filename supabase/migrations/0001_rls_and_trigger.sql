-- Health Assistant – RLS politiky + auto-vytvorenie profilu
-- Spustiť v Supabase: SQL Editor → New query → vložiť → Run
-- (až PO `npm run db:push`, ktorý vytvorí tabuľky).
--
-- POZNÁMKA K ARCHITEKTÚRE:
-- Appka číta/zapisuje dáta serverovo cez Prisma (rola z DATABASE_URL), ktorá
-- RLS OBCHÁDZA. Vlastníctvo riadkov vynucujeme v kóde (filtrovaním podľa userId
-- z prihlásenej session). RLS nižšie je obrana navyše a pripravenosť na budúcich
-- klientov / priame Supabase dotazy z klienta.

-- ── auto-vytvorenie public."User" po registrácii v auth.users ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public."User" (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── auto-čistenie profilu po zmazaní auth.users ──
-- Zabraňuje "osirelým" public."User" riadkom (auth.users zmizne, profil ostane),
-- ktoré spôsobujú "Database error creating new user" pri ďalšom použití toho
-- istého emailu (kolízia na unikátnom emaile). Trigger na auth.users je mimo
-- Prisma schémy, takže ho `prisma db push` nezmaže. Cross-schema FK na
-- auth.users zámerne NEpoužívame – db push by ho mohol odstrániť.
create or replace function public.handle_user_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public."User" where id = old.id;
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute procedure public.handle_user_delete();

-- ── grants pre rolu authenticated (pre prípadné priame Supabase dotazy) ──
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ── zapnúť RLS na všetkých tabuľkách ──
alter table "User"             enable row level security;
alter table "Goal"             enable row level security;
alter table "WeightLog"        enable row level security;
alter table "Food"             enable row level security;
alter table "FoodLog"          enable row level security;
alter table "ScheduleEvent"    enable row level security;
alter table "Restaurant"       enable row level security;
alter table "RestaurantMenu"   enable row level security;
alter table "MenuItem"         enable row level security;
alter table "MealPlan"         enable row level security;
alter table "MealPlanItem"     enable row level security;
alter table "AiInsight"        enable row level security;
alter table "Notification"     enable row level security;
alter table "PushSubscription" enable row level security;

-- ── User (id = auth.uid()) ──
create policy "user_self_select" on "User" for select using (id = auth.uid());
create policy "user_self_update" on "User" for update using (id = auth.uid()) with check (id = auth.uid());

-- ── pomocná makro-šablóna: tabuľky s priamym userId ──
-- Goal
create policy "own_all" on "Goal" using ("userId" = auth.uid()) with check ("userId" = auth.uid());
-- WeightLog
create policy "own_all" on "WeightLog" using ("userId" = auth.uid()) with check ("userId" = auth.uid());
-- FoodLog
create policy "own_all" on "FoodLog" using ("userId" = auth.uid()) with check ("userId" = auth.uid());
-- ScheduleEvent
create policy "own_all" on "ScheduleEvent" using ("userId" = auth.uid()) with check ("userId" = auth.uid());
-- Restaurant
create policy "own_all" on "Restaurant" using ("userId" = auth.uid()) with check ("userId" = auth.uid());
-- MealPlan
create policy "own_all" on "MealPlan" using ("userId" = auth.uid()) with check ("userId" = auth.uid());
-- AiInsight
create policy "own_all" on "AiInsight" using ("userId" = auth.uid()) with check ("userId" = auth.uid());
-- Notification
create policy "own_all" on "Notification" using ("userId" = auth.uid()) with check ("userId" = auth.uid());
-- PushSubscription
create policy "own_all" on "PushSubscription" using ("userId" = auth.uid()) with check ("userId" = auth.uid());

-- ── Food: globálna cache (userId IS NULL) je čitateľná pre každého; zápis len vlastné ──
create policy "food_select" on "Food" for select using ("userId" = auth.uid() or "userId" is null);
create policy "food_insert" on "Food" for insert with check ("userId" = auth.uid());
create policy "food_update" on "Food" for update using ("userId" = auth.uid()) with check ("userId" = auth.uid());
create policy "food_delete" on "Food" for delete using ("userId" = auth.uid());

-- ── deti cez rodiča ──
-- RestaurantMenu cez Restaurant
create policy "menu_all" on "RestaurantMenu"
  using (exists (select 1 from "Restaurant" r where r.id = "RestaurantMenu"."restaurantId" and r."userId" = auth.uid()))
  with check (exists (select 1 from "Restaurant" r where r.id = "RestaurantMenu"."restaurantId" and r."userId" = auth.uid()));

-- MenuItem cez RestaurantMenu → Restaurant
create policy "menuitem_all" on "MenuItem"
  using (exists (
    select 1 from "RestaurantMenu" m join "Restaurant" r on r.id = m."restaurantId"
    where m.id = "MenuItem"."menuId" and r."userId" = auth.uid()))
  with check (exists (
    select 1 from "RestaurantMenu" m join "Restaurant" r on r.id = m."restaurantId"
    where m.id = "MenuItem"."menuId" and r."userId" = auth.uid()));

-- MealPlanItem cez MealPlan
create policy "planitem_all" on "MealPlanItem"
  using (exists (select 1 from "MealPlan" p where p.id = "MealPlanItem"."mealPlanId" and p."userId" = auth.uid()))
  with check (exists (select 1 from "MealPlan" p where p.id = "MealPlanItem"."mealPlanId" and p."userId" = auth.uid()));
