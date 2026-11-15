-- Health Assistant – RLS pre tabuľky pridané PO prvej migrácii
-- Spustiť v Supabase: SQL Editor → New query → vložiť → Run (po `npm run db:push`).
--
-- Platí to isté ako v 0001: appka číta/zapisuje serverovo cez Prisma, ktorá RLS
-- OBCHÁDZA, a vlastníctvo riadkov vynucuje v kóde. Toto je obrana navyše pre
-- prípad priameho prístupu cez Supabase klienta (anon/authenticated kľúč).
--
-- Skript je idempotentný – dá sa spustiť opakovane.

-- ── tabuľky s priamym userId ──
do $$
declare t text;
begin
  foreach t in array array[
    'TrainingProgram', 'ExerciseLog', 'WorkoutBurn', 'StepCount', 'FavoriteMeal',
    'DailyCheckin', 'ShoppingList', 'NutritionProtocol', 'WorkoutSplit',
    'GymSplitDay', 'FavoriteFood', 'FoodCombo'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "own_all" on %I', t);
    execute format(
      'create policy "own_all" on %I using ("userId" = auth.uid()) with check ("userId" = auth.uid())',
      t
    );
  end loop;
end $$;

-- ── deti cez rodiča ──

-- ProgramDay cez TrainingProgram
alter table "ProgramDay" enable row level security;
drop policy if exists "programday_all" on "ProgramDay";
create policy "programday_all" on "ProgramDay"
  using (exists (
    select 1 from "TrainingProgram" p
    where p.id = "ProgramDay"."programId" and p."userId" = auth.uid()))
  with check (exists (
    select 1 from "TrainingProgram" p
    where p.id = "ProgramDay"."programId" and p."userId" = auth.uid()));

-- ProgramExercise cez ProgramDay → TrainingProgram
alter table "ProgramExercise" enable row level security;
drop policy if exists "programexercise_all" on "ProgramExercise";
create policy "programexercise_all" on "ProgramExercise"
  using (exists (
    select 1 from "ProgramDay" d join "TrainingProgram" p on p.id = d."programId"
    where d.id = "ProgramExercise"."dayId" and p."userId" = auth.uid()))
  with check (exists (
    select 1 from "ProgramDay" d join "TrainingProgram" p on p.id = d."programId"
    where d.id = "ProgramExercise"."dayId" and p."userId" = auth.uid()));

-- SplitExercise cez WorkoutSplit
alter table "SplitExercise" enable row level security;
drop policy if exists "splitexercise_all" on "SplitExercise";
create policy "splitexercise_all" on "SplitExercise"
  using (exists (
    select 1 from "WorkoutSplit" s
    where s.id = "SplitExercise"."splitId" and s."userId" = auth.uid()))
  with check (exists (
    select 1 from "WorkoutSplit" s
    where s.id = "SplitExercise"."splitId" and s."userId" = auth.uid()));

-- FoodComboItem cez FoodCombo
alter table "FoodComboItem" enable row level security;
drop policy if exists "foodcomboitem_all" on "FoodComboItem";
create policy "foodcomboitem_all" on "FoodComboItem"
  using (exists (
    select 1 from "FoodCombo" c
    where c.id = "FoodComboItem"."comboId" and c."userId" = auth.uid()))
  with check (exists (
    select 1 from "FoodCombo" c
    where c.id = "FoodComboItem"."comboId" and c."userId" = auth.uid()));

-- grants pre rolu authenticated aj na nové tabuľky
grant select, insert, update, delete on all tables in schema public to authenticated;
