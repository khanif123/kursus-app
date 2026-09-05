'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentProfile } from '@/lib/auth';
import AdminNav from '@/components/AdminNav';

export default function AdminSchedulesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    class_id: '',
    session_date: '',
    start_time: '',
    end_time: '',
  });

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const p = await getCurrentProfile();
    if (!p) return router.push('/');
    if (!['admin', 'super_admin', 'teacher'].includes(p.role)) return router.push('/dashboard');
    setProfile(p);
    await loadData(p);
    setLoading(false);
  }

  async function loadData(p) {
    let classQuery = supabase.from('classes').select('*');
    if (p.role === 'teacher') classQuery = classQuery.eq('teacher_id', p.id);
    const { data: classData } = await classQuery;
    setClasses(classData || []);

    const classIds = (classData || []).map((c) => c.id);
    if (classIds.length > 0) {
      const { data: scheduleData } = await supabase
        .from('schedules')
        .select('*, classes(name)')
        .in('class_id', classIds)
        .order('session_date', { ascending: false });
      setSchedules(scheduleData || []);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const { error } = await supabase.from('schedules').insert({
      class_id: form.class_id,
      session_date: form.session_date,
      start_time: form.start_time,
      end_time: form.end_time,
    });

    if (error) {
      setMessage('Gagal menambah jadwal: ' + error.message);
    } else {
      setMessage('Jadwal berhasil ditambahkan.');
      setForm({ class_id: form.class_id, session_date: '', start_time: '', end_time: '' });
      loadData(profile);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Hapus jadwal ini?')) return;
    await supabase.from('schedules').delete().eq('id', id);
    loadData(profile);
  }

  if (loading) return <main className="p-6 text-center text-ink/60">Memuat...</main>;

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <h1 className="font-serif text-xl font-semibold text-pineDark mb-1">Panel Admin</h1>
      <p className="text-sm text-ink/60 mb-4">Kelola jadwal sesi kelas</p>
      <AdminNav role={profile.role} />

      {classes.length === 0 ? (
        <p className="text-sm text-ink/60">
          Belum ada kelas. {profile.role === 'teacher' ? 'Minta admin daftarkan kamu sebagai guru di sebuah kelas dulu.' : 'Tambah kelas dulu di menu Kelas.'}
        </p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-black/5 shadow-sm p-4 space-y-3 mb-8">
            <p className="font-medium text-sm">Tambah jadwal baru</p>

            <select
              required
              value={form.class_id}
              onChange={(e) => setForm({ ...form, class_id: e.target.value })}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            >
              <option value="">Pilih kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <input
              type="date"
              required
              value={form.session_date}
              onChange={(e) => setForm({ ...form, session_date: e.target.value })}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />

            <div className="flex gap-2">
              <input
                type="time"
                required
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
              <input
                type="time"
                required
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </div>

            {message && <p className="text-sm text-clay">{message}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-pine hover:bg-pineDark text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Tambah Jadwal'}
            </button>
          </form>

          <p className="font-medium text-sm mb-2">Daftar jadwal</p>
          <div className="space-y-2">
            {schedules.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4 flex justify-between items-start">
                <div>
                  <p className="font-medium">{s.classes?.name}</p>
                  <p className="text-sm text-ink/60">
                    {s.session_date} · {s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}
                  </p>
                </div>
                <button onClick={() => handleDelete(s.id)} className="text-clay text-sm underline underline-offset-2">
                  Hapus
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
