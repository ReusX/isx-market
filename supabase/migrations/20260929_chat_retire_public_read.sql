-- The chat feature is retired (nothing in the site reads chat_messages), but
-- its "anyone can read every message" policy was still live, exposing
-- user_id + username + message to the anon key. Authors keep their own rows
-- until they delete their account (/api/account/delete clears them).
drop policy if exists chat_select_all on public.chat_messages;
drop policy if exists chat_insert_own on public.chat_messages;
create policy chat_select_own on public.chat_messages for select to authenticated using ((select auth.uid()) = user_id);
