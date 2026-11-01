-- =============================================================================
-- Attendance Planner — Complete Supabase Setup & CyberVidya Migration
-- =============================================================================
-- Run this entire script ONCE in the Supabase SQL Editor.
-- Fixes RLS policies for `subjects` and `entries`, adds `course_code`,
-- and creates tables for CyberVidya synchronization.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Ensure `subjects` table RLS allows open collaboration (anon key)
-- -----------------------------------------------------------------------------
alter table public.subjects enable row level security;

drop policy if exists "anon can select subjects" on public.subjects;
create policy "anon can select subjects"
  on public.subjects for select
  using (true);

drop policy if exists "anon can insert subjects" on public.subjects;
create policy "anon can insert subjects"
  on public.subjects for insert
  with check (true);

drop policy if exists "anon can update subjects" on public.subjects;
create policy "anon can update subjects"
  on public.subjects for update
  using (true)
  with check (true);

drop policy if exists "anon can delete subjects" on public.subjects;
create policy "anon can delete subjects"
  on public.subjects for delete
  using (true);

-- -----------------------------------------------------------------------------
-- 2. Ensure `entries` table RLS allows open collaboration (anon key)
-- -----------------------------------------------------------------------------
alter table public.entries enable row level security;

drop policy if exists "anon can select entries" on public.entries;
create policy "anon can select entries"
  on public.entries for select
  using (true);

drop policy if exists "anon can insert entries" on public.entries;
create policy "anon can insert entries"
  on public.entries for insert
  with check (true);

drop policy if exists "anon can update entries" on public.entries;
create policy "anon can update entries"
  on public.entries for update
  using (true)
  with check (true);

-- -----------------------------------------------------------------------------
-- 3. Add `course_code` and `total_classes` columns
-- -----------------------------------------------------------------------------
-- Course code for CyberVidya mapping (e.g. BCS501)
alter table public.subjects
  add column if not exists course_code text;

create index if not exists idx_subjects_course_code
  on public.subjects (course_code);

-- Optional per-user / per-entry total_classes override
alter table public.entries
  add column if not exists total_classes int;

-- -----------------------------------------------------------------------------
-- 4. CyberVidya Sync State
-- -----------------------------------------------------------------------------
-- Tracks the last sync status, timestamp, and student details per user.
create table if not exists public.cybervidya_sync (
  user_name text primary key,
  roll_number text not null,
  student_name text,
  section_name text,
  branch_name text,
  last_synced_at timestamptz not null default now(),
  status text not null default 'synced',
  synced_subjects_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.cybervidya_sync enable row level security;

drop policy if exists "anon can select cybervidya_sync" on public.cybervidya_sync;
create policy "anon can select cybervidya_sync"
  on public.cybervidya_sync for select
  using (true);

drop policy if exists "anon can manage cybervidya_sync" on public.cybervidya_sync;
create policy "anon can manage cybervidya_sync"
  on public.cybervidya_sync for all
  using (true)
  with check (true);

-- -----------------------------------------------------------------------------
-- 5. CyberVidya Subject Mappings
-- -----------------------------------------------------------------------------
-- Maps external CyberVidya course / component IDs to local subject records.
create table if not exists public.cybervidya_subject_mappings (
  id bigint generated always as identity primary key,
  user_name text not null,
  external_id text not null, -- e.g. "courseId_courseComponentId"
  course_code text,
  course_name text not null,
  component_name text,
  subject_name text not null,
  classes_done int not null default 0,
  classes_attended int not null default 0,
  last_synced_at timestamptz not null default now(),
  constraint uq_user_external unique (user_name, external_id)
);

create index if not exists idx_cv_mappings_user_subject
  on public.cybervidya_subject_mappings (user_name, subject_name);

alter table public.cybervidya_subject_mappings enable row level security;

drop policy if exists "anon can select cybervidya_subject_mappings" on public.cybervidya_subject_mappings;
create policy "anon can select cybervidya_subject_mappings"
  on public.cybervidya_subject_mappings for select
  using (true);

drop policy if exists "anon can manage cybervidya_subject_mappings" on public.cybervidya_subject_mappings;
create policy "anon can manage cybervidya_subject_mappings"
  on public.cybervidya_subject_mappings for all
  using (true)
  with check (true);

-- -----------------------------------------------------------------------------
-- 6. Add to Realtime Publication
-- -----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table cybervidya_sync;
exception
  when duplicate_object or undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table cybervidya_subject_mappings;
exception
  when duplicate_object or undefined_object then null;
end $$;
