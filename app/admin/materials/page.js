'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentProfile } from '@/lib/auth';
import AdminNav from '@/components/AdminNav';

export default function AdminMaterialsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    class_id: '',
    title: '',
    description: '',
    file_url: '',
    link_url: '',
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
      const { data: materialData } = await supabase
        .from('materials')
        .select('*, classes(name)')
        .in('class_id', classIds)
        .order('created_at', { ascending: false });
      setMaterials(materialData || []);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const { error } = await supabase.from('materials').insert({
      class_id: form.class_id,
      title: form.title,
      description: form.description || null,
      file_url: form.file_url || null,
      link_url: form.link_url || null,
    });

    if (error) {
      setMessage('Gagal menambah materi: ' + error.message);
    } else {
      setMessage('Materi berhasil ditambahkan.');
      setForm({ class_id: form.class_id, title: '', description: '', file_url: '', link_url: '' });
      loadData(profile);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Hapus materi ini?')) return;
    await supabase.from('materials').delete().eq('id', id);
    loadData(profile);
  }

  if (loading) return <main className="p-6 text-center text-ink/60">Memuat...</main>;

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <h1 className="font-serif text-xl font-semibold text-pineDark mb-1">Panel Admin</h1>
      <p className="text-sm text-ink/60 mb-4">Kelola materi belajar</p>
      <AdminNav role={profile.role} />

      {classes.length === 0 ? (
        <p className="text-sm text-ink/60">Belum ada kelas yang bisa diisi materinya.</p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-black/5 shadow-sm p-4 space-y-3 mb-8">
            <p className="font-medium text-sm">Tambah materi baru</p>

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
              required
              placeholder="Judul materi"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />

            <textarea
              placeholder="Deskripsi singkat (opsional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              rows={2}
            />

            <input
              placeholder="Link file (Google Drive, dsb — opsional)"
              value={form.file_url}
              onChange={(e) => setForm({ ...form, file_url: e.target.value })}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />

            <input
              placeholder="Link video/eksternal (opsional)"
              value={form.link_url}
              onChange={(e) => setForm({ ...form, link_url: e.target.value })}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />

            {message && <p className="text-sm text-clay">{message}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-pine hover:bg-pineDark text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Tambah Materi'}
            </button>
          </form>

          <p className="font-medium text-sm mb-2">Daftar materi</p>
          <div className="space-y-2">
            {materials.map((m) => (
              <div key={m.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4 flex justify-between items-start">
                <div>
                  <p className="text-xs text-pine/70">{m.classes?.name}</p>
                  <p className="font-medium">{m.title}</p>
                </div>
                <button onClick={() => handleDelete(m.id)} className="text-clay text-sm underline underline-offset-2">
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
