create table if not exists public.telegram_bot_sessions (
  chat_id bigint primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  selected_group_id uuid references public.groups(id) on delete set null,
  selected_date date not null default current_date,
  selected_para int not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.telegram_bot_sessions enable row level security;
