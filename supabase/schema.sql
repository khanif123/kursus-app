-- =========================================================
-- SKEMA DATABASE - APLIKASI KURSUS BAHASA INGGRIS
-- Cara pakai: copy semua isi file ini, lalu paste dan Run
-- di Supabase Dashboard -> SQL Editor -> New Query
-- =========================================================

-- 1. PROFIL PENGGUNA (guru, siswa, admin)
-- Terhubung ke sistem login bawaan Supabase (auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('admin', 'teacher', 'student')),
  phone text,
  created_at timestamp with time zone default now()
);

-- 2. KELAS KURSUS
create table classes (
  id uuid default gen_random_uuid() primary key,
  name text not null,              -- contoh: "English Basic A"
  level text,                      -- contoh: "Beginner"
  teacher_id uuid references profiles(id),
  location_lat double precision,   -- koordinat lokasi kursus
  location_lng double precision,
  radius_meters int default 150,   -- toleransi jarak untuk presensi GPS
  created_at timestamp with time zone default now()
);

-- 3. PENDAFTARAN SISWA KE KELAS
create table enrollments (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(class_id, student_id)
);

-- 4. JADWAL SESI KELAS
create table schedules (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references classes(id) on delete cascade,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamp with time zone default now()
);

-- 5. PRESENSI
create table attendance (
  id uuid default gen_random_uuid() primary key,
  schedule_id uuid references schedules(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  status text default 'hadir' check (status in ('hadir', 'terlambat', 'izin', 'alpa')),
  checked_at timestamp with time zone default now(),
  lat double precision,
  lng double precision,
  distance_meters double precision,
  unique(schedule_id, user_id)
);

-- 6. MATERI BELAJAR
create table materials (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references classes(id) on delete cascade,
  title text not null,
  description text,
  file_url text,        -- link file (PDF, dokumen, dll)
  link_url text,        -- link video/eksternal
  created_at timestamp with time zone default now()
);

-- 7. PROGRESS / CATATAN PERKEMBANGAN SISWA
create table progress (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  score numeric,
  note text,
  created_at timestamp with time zone default now()
);

-- =========================================================
-- KEAMANAN DATA (Row Level Security)
-- Supaya siswa hanya bisa lihat data miliknya sendiri,
-- dan guru/admin bisa lihat data kelasnya
-- =========================================================

alter table profiles enable row level security;
alter table classes enable row level security;
alter table enrollments enable row level security;
alter table schedules enable row level security;
alter table attendance enable row level security;
alter table materials enable row level security;
alter table progress enable row level security;

-- Semua user yang login boleh baca semua data (paling simpel untuk mulai)
-- Nanti bisa diperketat setelah aplikasi berjalan
create policy "read_all_profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "read_all_classes" on classes for select using (auth.role() = 'authenticated');
create policy "read_all_enrollments" on enrollments for select using (auth.role() = 'authenticated');
create policy "read_all_schedules" on schedules for select using (auth.role() = 'authenticated');
create policy "read_all_materials" on materials for select using (auth.role() = 'authenticated');
create policy "read_all_progress" on progress for select using (auth.role() = 'authenticated');

-- Presensi: user boleh baca semua, tapi hanya boleh insert presensi untuk dirinya sendiri
create policy "read_all_attendance" on attendance for select using (auth.role() = 'authenticated');
create policy "insert_own_attendance" on attendance for insert with check (auth.uid() = user_id);

-- Profil: user boleh update profilnya sendiri
create policy "update_own_profile" on profiles for update using (auth.uid() = id);
create policy "insert_own_profile" on profiles for insert with check (auth.uid() = id);
