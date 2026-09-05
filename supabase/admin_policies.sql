-- =========================================================
-- TAMBAHAN IZIN UNTUK ADMIN & SUPER ADMIN
-- Jalankan file ini SETELAH schema.sql
-- Caranya: Supabase Dashboard -> SQL Editor -> New Query
-- -> paste semua isi file ini -> Run
-- =========================================================

-- Perbolehkan role tambahan: 'super_admin' dan 'admin'
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'teacher', 'student'));

-- Fungsi bantu: cek apakah yang login adalah admin/super_admin
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$ language sql security definer;

-- Fungsi bantu: cek apakah yang login adalah guru pemilik kelas tsb
create or replace function teaches_class(class_id_input uuid)
returns boolean as $$
  select exists (
    select 1 from classes
    where id = class_id_input and teacher_id = auth.uid()
  );
$$ language sql security definer;

-- ---- KELAS: hanya admin/super_admin yang boleh tambah/ubah/hapus ----
create policy "admin_write_classes" on classes for insert with check (is_admin());
create policy "admin_update_classes" on classes for update using (is_admin());
create policy "admin_delete_classes" on classes for delete using (is_admin());

-- ---- JADWAL: admin/super_admin, atau guru pemilik kelas ----
create policy "admin_or_teacher_write_schedules" on schedules for insert
  with check (is_admin() or teaches_class(class_id));
create policy "admin_or_teacher_update_schedules" on schedules for update
  using (is_admin() or teaches_class(class_id));
create policy "admin_or_teacher_delete_schedules" on schedules for delete
  using (is_admin() or teaches_class(class_id));

-- ---- PENDAFTARAN SISWA KE KELAS: hanya admin/super_admin ----
create policy "admin_write_enrollments" on enrollments for insert with check (is_admin());
create policy "admin_delete_enrollments" on enrollments for delete using (is_admin());

-- ---- MATERI: admin/super_admin, atau guru pemilik kelas ----
create policy "admin_or_teacher_write_materials" on materials for insert
  with check (is_admin() or teaches_class(class_id));
create policy "admin_or_teacher_update_materials" on materials for update
  using (is_admin() or teaches_class(class_id));
create policy "admin_or_teacher_delete_materials" on materials for delete
  using (is_admin() or teaches_class(class_id));

-- ---- PROGRESS SISWA: admin/super_admin, atau guru pemilik kelas ----
create policy "admin_or_teacher_write_progress" on progress for insert
  with check (is_admin() or teaches_class(class_id));
create policy "admin_or_teacher_update_progress" on progress for update
  using (is_admin() or teaches_class(class_id));

-- ---- PROFIL: super_admin boleh ubah data & role user lain ----
create policy "super_admin_update_any_profile" on profiles for update
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin')
  );

-- =========================================================
-- KEAMANAN PENTING: cegah user mengubah role dirinya sendiri
-- Tanpa ini, siswa/guru bisa menjadikan diri sendiri admin
-- lewat aplikasi. Trigger ini memblokir hal itu.
-- =========================================================
create or replace function prevent_role_self_escalation()
returns trigger as $$
begin
  if new.role <> old.role then
    if not exists (
      select 1 from profiles where id = auth.uid() and role = 'super_admin'
    ) then
      raise exception 'Hanya super admin yang boleh mengubah peran (role) pengguna.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prevent_role_escalation on profiles;
create trigger trg_prevent_role_escalation
  before update on profiles
  for each row execute function prevent_role_self_escalation();

-- Perketat juga pendaftaran akun baru: tidak boleh langsung daftar
-- sebagai admin/super_admin lewat form daftar di website
drop policy if exists "insert_own_profile" on profiles;
create policy "insert_own_profile" on profiles for insert
  with check (auth.uid() = id and role in ('teacher', 'student'));
