-- ============================================================
-- SUPABASE STORAGE SETUP FOR SAGO STAFF PORTAL
-- ============================================================

-- 1. Create the 'sago-proofs' public storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sago-proofs',
  'sago-proofs',
  true,
  52428800, -- 50 MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

-- 2. Drop existing restrictive policies if any
drop policy if exists "Public Access for sago-proofs" on storage.objects;
drop policy if exists "Allow Authenticated and Anon Uploads" on storage.objects;
drop policy if exists "Allow Update and Delete" on storage.objects;

-- 3. Enable read access for everyone (Public CDN)
create policy "Public Access for sago-proofs"
on storage.objects for select
using ( bucket_id = 'sago-proofs' );

-- 4. Enable insert/upload access for staff & admins
create policy "Allow Authenticated and Anon Uploads"
on storage.objects for insert
with check ( bucket_id = 'sago-proofs' );

-- 5. Enable update & delete access
create policy "Allow Update and Delete"
on storage.objects for update
using ( bucket_id = 'sago-proofs' );

create policy "Allow Delete for sago-proofs"
on storage.objects for delete
using ( bucket_id = 'sago-proofs' );
