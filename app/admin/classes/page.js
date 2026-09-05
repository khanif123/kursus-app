'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentProfile } from '@/lib/auth';
import AdminNav from '@/components/AdminNav';

export default function AdminClassesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    level: '',
    teacher_id: '',
    location_lat: '',
    location_lng: '',
    radius_meters: 150,
  });

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const p = await getCurrentProfile();
    if (!p) return router.push('/');
    if (!['admin', 'super_admin'].includes(p.role)) return router.push('/dashboard');
    setProfile(p);
    await loadData();
    setLoading(false);
  }

  async function loadData() {
    const { data: classData } = await supabase
      .from('classes')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });
    setClasses(classData || []);

    const { data: teacherData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'teacher');
    setTeachers(teacherData || []);
  }

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((f) => ({
        ...f,
        location_lat: pos.coords.latitude.toFixed(6),
        location_lng: pos.coords.longitude.toFixed(6),
      }));
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const { error } = await supabase.from('classes').insert({
      name: form.name,
      level: form.level || null,
      teacher_id: form.teacher_id || null,
      location_lat: form.location_lat ? parseFloat(form.location_lat) : null,
      location_lng: form.location_lng ? parseFloat(form.location_lng) : null,
      radius_meters: form.radius_meters ? parseInt(form.radius_meters) : 150,
    });

    if (error) {
      setMessage('Gagal menambah kelas: ' + error.message);
    } else {
      setMessage('Kelas berhasil ditambahkan.');
      setForm({ name: '', level: '', teacher_id: '', location_lat: '', location_lng: '', radius_meters: 150 });
      loadData();
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Hapus kelas ini? Data jadwal & materi terkait juga akan terhapus.')) return;
    await supabase.from('classes').delete().eq('id', id);
    loadData();
  }

  if (loading) return <main className="p-6 text-center text-ink/60">Memuat...</main>;

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <h1 className="font-serif text-xl font-semibold text-pineDark mb-1">Panel Admin</h1>
      <p className="text-sm text-ink/60 mb-4">Kelola kelas kursus</p>
      <AdminNav role={profile.role} />

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-black/5 shadow-sm p-4 space-y-3 mb-8">
        <p className="font-medium text-sm">Tambah kelas baru</p>

        <input
          required
          placeholder="Nama kelas (contoh: English Basic A)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />

        <input
          placeholder="Level (contoh: Beginner)"
          value={form.level}
          onChange={(e) => setForm({ ...form, level: e.target.value })}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />

        <select
          value={form.teacher_id}
          onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        >
          <option value="">Pilih guru pengajar (opsional)</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            placeholder="Latitude"
            value={form.location_lat}
            onChange={(e) => setForm({ ...form, location_lat: e.target.value })}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <input
            placeholder="Longitude"
            value={form.location_lng}
            onChange={(e) => setForm({ ...form, location_lng: e.target.value })}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
        </div>
        <button type="button" onClick={useMyLocation} className="text-sm text-pine underline underline-offset-2">
          Pakai lokasi saya sekarang
        </button>

        <div>
          <label className="text-xs text-ink/60">Radius toleransi presensi (meter)</label>
          <input
            type="number"
            value={form.radius_meters}
            onChange={(e) => setForm({ ...form, radius_meters: e.target.value })}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
        </div>

        {message && <p className="text-sm text-clay">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-pine hover:bg-pineDark text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Tambah Kelas'}
        </button>
      </form>

      <p className="font-medium text-sm mb-2">Daftar kelas</p>
      <div className="space-y-2">
        {classes.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4 flex justify-between items-start">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-ink/60">
                {c.level || '-'} · Guru: {c.profiles?.full_name || 'belum ditentukan'}
              </p>
            </div>
            <button onClick={() => handleDelete(c.id)} className="text-clay text-sm underline underline-offset-2">
              Hapus
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
