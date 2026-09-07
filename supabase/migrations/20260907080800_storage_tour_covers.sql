-- Storage-Bucket für Tour-Coverbilder (siehe CLAUDE.md §13.11, §12).
-- Öffentlich lesbar (Coverbilder erscheinen auf öffentlichen Tourkacheln),
-- aber nur Admins dürfen Dateien hochladen/ändern/löschen.

insert into storage.buckets (id, name, public)
values ('tour-covers', 'tour-covers', true)
on conflict (id) do nothing;

create policy "tour_covers_public_read"
  on storage.objects for select
  using (bucket_id = 'tour-covers');

create policy "tour_covers_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'tour-covers' and public.is_admin());

create policy "tour_covers_admin_update"
  on storage.objects for update
  using (bucket_id = 'tour-covers' and public.is_admin());

create policy "tour_covers_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'tour-covers' and public.is_admin());
