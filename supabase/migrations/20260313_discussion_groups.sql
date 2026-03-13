-- ─────────────────────────────────────────────────────────────────────────────
-- Discussion Groups
-- Groundwork for gated forum areas (clubs, custom groups, etc.)
-- Run this in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. discussion_groups ────────────────────────────────────────────────────
-- A group can be linked to an existing club (club_id) or be standalone.
-- type: 'club' | 'custom'  (club = auto-created alongside a club record,
--                            custom = manually created, e.g. "Verified Players")
create table if not exists public.discussion_groups (
  id          uuid default uuid_generate_v4() primary key,
  slug        text not null unique,          -- e.g. 'auckland-gc-club'
  name        text not null,                 -- display name
  description text,
  type        text not null default 'custom' check (type in ('club', 'custom')),
  club_id     uuid references public.clubs(id) on delete set null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamp with time zone default now() not null
);

-- ── 2. discussion_group_members ─────────────────────────────────────────────
-- role: 'owner' | 'admin' | 'member'
create table if not exists public.discussion_group_members (
  id        uuid default uuid_generate_v4() primary key,
  group_id  uuid references public.discussion_groups(id) on delete cascade not null,
  user_id   uuid references public.profiles(id) on delete cascade not null,
  role      text not null default 'member' check (role in ('owner', 'admin', 'member')),
  added_by  uuid references public.profiles(id) on delete set null,
  added_at  timestamp with time zone default now() not null,
  unique (group_id, user_id)
);

-- ── 3. Add group_id to forum_threads ────────────────────────────────────────
-- null  = visible to everyone (default / existing behaviour)
-- set   = only visible to members of that discussion_group
alter table public.forum_threads
  add column if not exists group_id uuid references public.discussion_groups(id) on delete set null;

-- Index for fast group-scoped queries
create index if not exists forum_threads_group_id_idx on public.forum_threads(group_id);
create index if not exists dgm_group_user_idx on public.discussion_group_members(group_id, user_id);

-- ── 4. RLS policies ─────────────────────────────────────────────────────────
-- forum_threads: allow SELECT if group_id is null OR user is a group member
-- (Assumes RLS is already enabled on forum_threads — if not, enable it first:
--   alter table public.forum_threads enable row level security; )

-- Drop any existing select policy if you need to recreate it:
-- drop policy if exists "threads_select" on public.forum_threads;

create policy "threads_select" on public.forum_threads
  for select using (
    group_id is null
    or exists (
      select 1 from public.discussion_group_members dgm
      where dgm.group_id = forum_threads.group_id
        and dgm.user_id  = auth.uid()
    )
  );

-- forum_threads INSERT: signed-in users can post to public threads;
-- gated threads require membership.
create policy "threads_insert" on public.forum_threads
  for insert with check (
    auth.uid() is not null
    and (
      group_id is null
      or exists (
        select 1 from public.discussion_group_members dgm
        where dgm.group_id = forum_threads.group_id
          and dgm.user_id  = auth.uid()
      )
    )
  );

-- forum_posts: inherit same visibility as their parent thread
-- (RLS on forum_posts should already exist; this adds the group check)
-- drop policy if exists "posts_select" on public.forum_posts;

create policy "posts_select_group" on public.forum_posts
  for select using (
    exists (
      select 1 from public.forum_threads t
      where t.id = forum_posts.thread_id
        and (
          t.group_id is null
          or exists (
            select 1 from public.discussion_group_members dgm
            where dgm.group_id = t.group_id
              and dgm.user_id  = auth.uid()
          )
        )
    )
  );

-- discussion_groups: anyone can read group names/descriptions
alter table public.discussion_groups enable row level security;
create policy "groups_select_public" on public.discussion_groups
  for select using (true);

-- Only owners/admins can update group metadata
create policy "groups_update_admin" on public.discussion_groups
  for update using (
    exists (
      select 1 from public.discussion_group_members dgm
      where dgm.group_id = id
        and dgm.user_id  = auth.uid()
        and dgm.role in ('owner', 'admin')
    )
  );

-- discussion_group_members: members can see who else is in their group
alter table public.discussion_group_members enable row level security;
create policy "dgm_select" on public.discussion_group_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.discussion_group_members me
      where me.group_id = discussion_group_members.group_id
        and me.user_id  = auth.uid()
    )
  );

-- Only admins/owners can add members
create policy "dgm_insert_admin" on public.discussion_group_members
  for insert with check (
    exists (
      select 1 from public.discussion_group_members me
      where me.group_id = discussion_group_members.group_id
        and me.user_id  = auth.uid()
        and me.role in ('owner', 'admin')
    )
  );

-- Only admins/owners can remove members (or self-remove)
create policy "dgm_delete" on public.discussion_group_members
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.discussion_group_members me
      where me.group_id = discussion_group_members.group_id
        and me.user_id  = auth.uid()
        and me.role in ('owner', 'admin')
    )
  );
