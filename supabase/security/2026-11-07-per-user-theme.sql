-- Per-user theme preference (additive, safe to re-run)
-- NULL = default theme 'rondesignlab' (Liquid Glass).
-- Users can update their own row via existing policy gym_users_update_own_gym.
alter table public.gym_users add column if not exists theme text;
comment on column public.gym_users.theme is
  'Per-user UI theme id; NULL = default (rondesignlab / Liquid Glass)';
