-- The retired games and wallet (chat, penalty shots, quests, snake, the
-- points wallet) no longer take writes or reads from clients. Their rows
-- stay (account deletion still clears them, with the service key); only
-- the client roles lose access, so nothing the site no longer uses can be
-- written through the public key.
drop policy if exists "chat_delete_own" on public.chat_messages;
drop policy if exists "penalty_insert_own" on public.penalty_shots;
drop policy if exists "quest_insert_own" on public.quest_completions;
drop policy if exists "Users insert own snake scores" on public.snake_scores;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "wallet_requests_own" on public.wallet_requests;
revoke all on public.chat_messages, public.penalty_shots, public.quest_completions,
  public.snake_scores, public.transactions, public.wallet_requests, public.referrals
  from anon, authenticated;
