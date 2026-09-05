'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentProfile } from '@/lib/auth';
import AdminNav from '@/components/AdminNav';

export default function AdminCertificatesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [students, setStudents] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ student_id: '', semester: '', level: '', title: '', file: null });

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const p = await getCurrentProfile();
    if (!p) return router.push('/');
    if (!['admin', 'super_admin'].includes(p.role)) return router.push('/dashboard');
    setProfile(p);

    const { data: studentData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'student');
    setStudents(studentData || []);

    await loadCertificates();
    setLoading(false);
  }

  async function loadCertificates() {
    const { data } = await supabase
      .from('certificates')
      .select('*, profiles(full_name)')
      .order('uploaded_at', { ascending: false });
    setCertificates(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.file) {
      setMessage('Pilih file sertifikat dulu.');
      return;
    }
    setSaving(true);
    setMessage('');

    const fileExt = form.file.name.split('.').pop();
    const filePath = `${form.student_id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(filePath, form.file);

    if (uploadError) {
      setMessage('Gagal upload file: ' + uploadError.message);
      setSaving(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();

    const { error } = await supabase.from('certificates').insert({
      student_id: form.student_id,
      semester: form.semester,
      level: form.level || null,
      title: form.title,
      file_path: filePath,
      uploaded_by: sessionData.session.user.id,
    });

    if (error) {
      setMessage('Gagal menyimpan: ' + error.message);
    } else {
      setMessage('Sertifikat berhasil diunggah.');
      setForm({ student_id: '', semester: '', level: '', title: '', file: null });
      loadCertificates();
    }
    setSaving(false);
  }

  async function handleDelete(id, filePath) {
    if (!confirm('Hapus sertifikat ini?')) return;
    await supabase.storage.from('certificates').remove([filePath]);
    await supabase.from('certificates').delete().eq('id', id);
    loadCertificates();
  }

  async function handleView(path) {
    const { data, error } = await supabase.storage
      .from('certificates')
      .createSignedUrl(path, 60 * 5);
    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  }

  if (loading) return <main className="p-6 text-center text-ink/60">Memuat...</main>;

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <h1 className="font-serif text-xl font-semibold text-pineDark mb-1">Panel Admin</h1>
      <p className="text-sm text-ink/60 mb-4">Unggah sertifikat siswa</p>
      <AdminNav role={profile.role} />

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-black/5 shadow-sm p-4 space-y-3 mb-8">
        <p className="font-medium text-sm">Tambah sertifikat baru</p>

        <select
          required
          value={form.student_id}
          onChange={(e) => setForm({ ...form, student_id: e.target.value })}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        >
          <option value="">Pilih siswa</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>

        <input
          required
          placeholder="Semester (contoh: Semester 1 2026)"
          value={form.semester}
          onChange={(e) => setForm({ ...form, semester: e.target.value })}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />

        <select
          value={form.level}
          onChange={(e) => setForm({ ...form, level: e.target.value })}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        >
          <option value="">Pilih level CEFR (opsional)</option>
          <option value="PreA1">PreA1</option>
          <option value="A1">A1</option>
          <option value="A2">A2</option>
          <option value="B1">B1</option>
          <option value="B2">B2</option>
          <option value="C1">C1</option>
          <option value="C2">C2</option>
        </select>

        <input
          required
          placeholder="Judul sertifikat"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />

        <div>
          <label className="block text-sm font-medium mb-1">File sertifikat (PDF/gambar)</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
            className="w-full text-sm"
          />
        </div>

        {message && <p className="text-sm text-clay">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-pine hover:bg-pineDark text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'Mengunggah...' : 'Unggah Sertifikat'}
        </button>
      </form>

      <p className="font-medium text-sm mb-2">Daftar sertifikat</p>
      {certificates.length === 0 && <p className="text-sm text-ink/60">Belum ada sertifikat.</p>}
      <div className="space-y-2">
        {certificates.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-pine/70">{c.semester} &middot; {c.profiles?.full_name}</p>
                <p className="font-medium">{c.title}</p>
                {c.level && <p className="text-xs text-mustard font-medium mt-0.5">Level {c.level}</p>}
              </div>
              <button onClick={() => handleDelete(c.id, c.file_path)} className="text-clay text-sm underline underline-offset-2">
                Hapus
              </button>
            </div>
            <button onClick={() => handleView(c.file_path)} className="text-sm text-pine underline underline-offset-2 mt-1">
              Lihat file
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
