# Aplikasi Kursus Bahasa Inggris (Presensi, Materi, Progress)

100% gratis — hosting di Vercel, database di Supabase.

## Fitur di versi ini
- Login & daftar akun (guru/siswa mendaftar sendiri)
- Presensi mandiri pakai GPS (harus di lokasi kelas untuk bisa absen)
- Lihat materi belajar per kelas
- Dashboard ringkas kelas yang diikuti/diajar
- **Panel Admin di dalam website** (tidak perlu buka Supabase lagi setelah setup awal):
  - **Super Admin**: semua akses admin + bisa mengubah peran (role) pengguna lain
  - **Admin**: tambah/hapus kelas, jadwal, materi, dan daftarkan siswa ke kelas
  - **Guru**: tambah/hapus jadwal dan materi untuk kelas yang dia ajar saja

### Satu langkah manual yang tidak bisa dihindari (demi keamanan)
Supaya orang lain tidak bisa mendaftar sendiri jadi admin lewat form daftar,
akun **super admin pertama** harus di-set manual sekali lewat Supabase Table
Editor (lihat Langkah 4 di bawah). Setelah super admin pertama ada, **semua
hal lain — tambah admin baru, kelas, jadwal, materi, siswa — bisa dilakukan
langsung dari website**, tidak perlu buka Supabase lagi.

---

## LANGKAH 1 — Buat akun Supabase (database, gratis)

1. Buka https://supabase.com lalu klik **Start your project** dan daftar pakai email/GitHub.
2. Klik **New Project**.
   - Nama project: bebas, misal `kursus-inggris`
   - Buat password database (simpan baik-baik, tidak perlu diingat terus)
   - Pilih region terdekat (misal Singapore)
3. Tunggu 1-2 menit sampai project selesai dibuat.
4. Di sidebar kiri, klik **SQL Editor** → **New query**.
5. Buka file `supabase/schema.sql` yang ada di folder project ini, copy semua isinya,
   paste ke SQL Editor, lalu klik **Run**.
   - Ini akan membuat semua tabel yang dibutuhkan aplikasi.
6. Buka lagi **SQL Editor** → **New query**, lalu lakukan hal yang sama untuk
   file `supabase/admin_policies.sql` (copy isinya, paste, klik **Run**).
   Ini menyalakan Panel Admin dan mengatur siapa boleh mengubah data apa.
7. Di sidebar kiri, klik **Project Settings** (ikon gear) → **API**.
   - Catat **Project URL** dan **anon public key** — dua ini dibutuhkan di Langkah 3.

## LANGKAH 2 — Deploy aplikasi ke Vercel

1. Buat akun gratis di https://vercel.com (bisa daftar pakai GitHub).
2. Upload folder project ini ke akun GitHub kamu:
   - Buat repository baru di https://github.com/new
   - Upload semua file di folder `kursus-app` ke repository tersebut
3. Di Vercel, klik **Add New → Project**, lalu pilih repository yang tadi dibuat.
4. Sebelum klik Deploy, buka bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL` → isi dengan Project URL dari Langkah 1
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → isi dengan anon public key dari Langkah 1
5. Klik **Deploy**. Tunggu 1-2 menit sampai selesai.
6. Aplikasi kamu sudah online! Vercel akan kasih link seperti
   `https://nama-project.vercel.app` — ini yang dibagikan ke guru & siswa.

## LANGKAH 3 — Jadikan dirimu Super Admin (satu-satunya langkah manual)

1. Buka link aplikasi kamu yang sudah online, klik **Daftar di sini**, dan
   buat akun untuk dirimu sendiri (peran boleh diisi apa saja, nanti diganti).
2. Buka Supabase Dashboard → **Table Editor** → tabel `profiles`.
3. Cari baris dengan namamu, lalu ubah kolom `role` menjadi `super_admin`.
4. Simpan. Selesai — sekarang login lagi ke aplikasi, di dashboard akan
   muncul tombol **Buka Panel Admin**.

Setelah ini, **kamu tidak perlu buka Supabase lagi**. Semua admin/guru
berikutnya, kelas, jadwal, materi, dan pendaftaran siswa dikelola lewat
Panel Admin di website.

## Cara pakai sehari-hari
- Siswa/guru buka link aplikasi → daftar akun sendiri → login
- Super admin masuk ke **Panel Admin → Pengguna** untuk menaikkan seseorang
  jadi Admin atau memastikan role Guru sudah benar
- Admin masuk ke **Panel Admin → Kelas** untuk membuat kelas, lalu
  **Daftarkan Siswa** untuk memasukkan siswa ke kelas tersebut
- Admin/Guru masuk ke **Panel Admin → Jadwal** dan **Materi** untuk mengisi
  jadwal sesi dan materi belajar
- Saat jam kelas, siswa/guru buka **Absen Hari Ini** dan tap "Absen sekarang"
  — sistem otomatis cek apakah mereka ada di lokasi kelas

## Kalau mau coba dulu di komputer sendiri (opsional)
Butuh Node.js terinstall, lalu jalankan di terminal:
```
npm install
cp .env.local.example .env.local
# isi .env.local dengan data Supabase kamu
npm run dev
```
Buka http://localhost:3000 di browser.
