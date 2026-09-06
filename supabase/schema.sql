-- ============================================================
-- SAGO STAFF PORTAL — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ============================================================

-- 1. PROFILES / USERS TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text not null check (role in ('superadmin', 'admin', 'manager', 'employee')),
  dept text default '—',
  phone text default '',
  email text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Admins can insert and update profiles"
  on public.profiles for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin')
    )
  );

-- 2. ATTENDANCE TABLE
create table if not exists public.attendance (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  morning text check (morning in ('present', 'absent', null)),
  afternoon text check (afternoon in ('present', 'absent', null)),
  marked_by uuid references public.profiles(id),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (date, user_id)
);

alter table public.attendance enable row level security;

create policy "Attendance viewable by authenticated users"
  on public.attendance for select
  to authenticated
  using (true);

create policy "Admins can modify attendance"
  on public.attendance for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin')
    )
  );

-- 3. TASKS TABLE
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  dept text default '—',
  assigned_to uuid references public.profiles(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  status text not null default 'assigned' check (status in ('assigned', 'in-progress', 'done')),
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  due date,
  verified_by uuid references public.profiles(id),
  verified_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tasks enable row level security;

create policy "Tasks viewable by authenticated users"
  on public.tasks for select
  to authenticated
  using (true);

create policy "Managers and Admins can create tasks"
  on public.tasks for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'manager')
    )
  );

create policy "Task modification policy"
  on public.tasks for update
  to authenticated
  using (true);

create policy "Task deletion by creator or admin"
  on public.tasks for delete
  to authenticated
  using (
    assigned_by = auth.uid() or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin')
    )
  );

-- 4. TASK REPLIES / PROOF
create table if not exists public.task_replies (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null not null,
  name text not null,
  text text default '',
  photo text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.task_replies enable row level security;

create policy "Replies viewable by authenticated users"
  on public.task_replies for select
  to authenticated
  using (true);

create policy "Users can post replies"
  on public.task_replies for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 5. AUDIT HISTORY LOG
create table if not exists public.history (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  subject_id text,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.history enable row level security;

create policy "History viewable by authenticated users"
  on public.history for select
  to authenticated
  using (true);

create policy "System and users can insert history"
  on public.history for insert
  to authenticated
  with check (true);

-- 6. SETTINGS TABLE
create table if not exists public.settings (
  id text primary key default 'default',
  whatsapp_group text default '',
  updated_by text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.settings enable row level security;

create policy "Settings viewable by everyone"
  on public.settings for select
  to authenticated
  using (true);

create policy "Admins can update settings"
  on public.settings for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin')
    )
  );

-- Initial default settings row
insert into public.settings (id, whatsapp_group)
values ('default', '')
on conflict (id) do nothing;
