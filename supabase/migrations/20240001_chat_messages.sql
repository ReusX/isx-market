-- ─────────────────────────────────────────────────────────────────
-- Community chat messages
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────

create table if not exists chat_messages (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users not null,
  username    text not null,
  message     text not null check (char_length(message) between 1 and 500),
  created_at  timestamptz default now() not null
);

-- Row Level Security
alter table chat_messages enable row level security;

-- Anyone (including guests) can read
create policy "chat_read_all"
  on chat_messages for select
  using (true);

-- Only authenticated users can insert their own messages
create policy "chat_insert_own"
  on chat_messages for insert
  with check (auth.uid() = user_id);

-- Users can delete only their own messages
create policy "chat_delete_own"
  on chat_messages for delete
  using (auth.uid() = user_id);

-- Index for fast time-ordered fetching
create index if not exists chat_messages_created_at_idx
  on chat_messages (created_at desc);

-- Enable Realtime on this table
alter publication supabase_realtime add table chat_messages;
