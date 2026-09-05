-- =========================================================
-- TAMBAHAN: NILAI, PEMBAYARAN, SERTIFIKAT
-- Jalankan file ini SETELAH schema.sql dan admin_policies.sql
-- Caranya: Supabase Dashboard -> SQL Editor -> New Query
-- -> paste semua isi file ini -> Run
-- =========================================================

-- 1. NILAI (Mid Test & Final Test) per siswa per kelas per semester
create table grades (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  semester text not null,        -- contoh: "Semester 1 2026"
  mid_score numeric,
  final_score numeric,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(student_id, class_id, semester)
);

alter table grades enable row level security;

create policy "read_own_or_staff_grades" on grades for select
  using (
    auth.uid() = student_id or is_admin() or teaches_class(class_id)
  );

create policy "teacher_or_admin_insert_grades" on grades for insert
  with check (is_admin() or teaches_class(class_id));

create policy "teacher_or_admin_update_grades" on grades for update
  using (is_admin() or teaches_class(class_id));

create policy "teacher_or_admin_delete_grades" on grades for delete
  using (is_admin() or teaches_class(class_id));

-- 2. PEMBAYARAN (siswa upload bukti transfer, admin konfirmasi)
create table payments (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade,
  period text not null,           -- contoh: "Oktober 2026" / "Semester 1 2026"
  amount numeric,
  proof_path text,                -- path file bukti transfer di Storage
  status text default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  notes text,
  submitted_at timestamp with time zone default now(),
  confirmed_by uuid references profiles(id),
  confirmed_at timestamp with time zone
);

alter table payments enable row level security;

create policy "read_own_or_admin_payments" on payments for select
  using (auth.uid() = student_id or is_admin());

create policy "student_insert_own_payment" on payments for insert
  with check (auth.uid() = student_id);

create policy "admin_update_payments" on payments for update
  using (is_admin());

-- Cegah siswa langsung mengeset status selain 'pending' saat mengirim bukti bayar
create or replace function prevent_payment_status_selfset()
returns trigger as $$
begin
  if new.status <> 'pending' and not is_admin() then
    raise exception 'Hanya admin yang boleh mengubah status pembayaran.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prevent_payment_status_selfset on payments;
create trigger trg_prevent_payment_status_selfset
  before insert on payments
  for each row execute function prevent_payment_status_selfset();

-- 3. SERTIFIKAT (diupload admin, dilihat/diunduh siswa pemilik)
create table certificates (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade,
  semester text not null,
  level text check (level in ('PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  title text not null,
  file_path text not null,        -- path file di Storage bucket 'certificates'
  uploaded_by uuid references profiles(id),
  uploaded_at timestamp with time zone default now()
);

alter table certificates enable row level security;

create policy "read_own_or_admin_certificates" on certificates for select
  using (auth.uid() = student_id or is_admin());

create policy "admin_write_certificates" on certificates for insert
  with check (is_admin());

create policy "admin_delete_certificates" on certificates for delete
  using (is_admin());

-- =========================================================
-- STORAGE: bucket untuk file sertifikat & bukti pembayaran
-- Keduanya privat (tidak bisa diakses publik tanpa login)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Sertifikat: admin yang upload, siswa pemilik & admin yang boleh lihat
create policy "certificates_select" on storage.objects for select
  using (
    bucket_id = 'certificates' and (
      is_admin() or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy "certificates_insert" on storage.objects for insert
  with check (bucket_id = 'certificates' and is_admin());

create policy "certificates_delete" on storage.objects for delete
  using (bucket_id = 'certificates' and is_admin());

-- Bukti pembayaran: siswa upload ke folder miliknya sendiri,
-- siswa & admin boleh lihat
create policy "payment_proofs_insert" on storage.objects for insert
  with check (
    bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "payment_proofs_select" on storage.objects for select
  using (
    bucket_id = 'payment-proofs' and (
      is_admin() or (storage.foldername(name))[1] = auth.uid()::text
    )
  );
