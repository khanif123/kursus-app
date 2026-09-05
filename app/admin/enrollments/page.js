'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentProfile } from '@/lib/auth';
import AdminNav from '@/components/AdminNav';

export default function AdminEnrollmentsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const p = await getCurrentProfile();
    if (!p) return router.push('/');
    if (!['admin', 'super_admin'].includes(p.role)) return router.push('/dashboard');
    setProfile(p);

    const { data: classData } = await supabase.from('classes').select('*');
    setClasses(classData || []);

    const { data: studentData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'student');
    setStudents(studentData || []);

    setLoading(false);
  }

  async function loadEnrollments(classId) {
    if (!classId) return setEnrollments([]);
    const { data } = await supabase
      .from('enrollments')
      .select('id, profiles(full_name)')
      .eq('class_id', classId);
    setEnrollments(data || []);
  }

  async function handleClassChange(classId) {
    setSelectedClass(classId);
    loadEnrollments(classId);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const { error } = await supabase.from('enrollments').insert({
      class_id: selectedClass,
      student_id: selectedStudent,
    });

    if (error) {
      setMessage(error.code === '23505' ? 'Siswa ini sudah terdaftar di kelas ini.' : 'Gagal: ' + error.message);
    } else {
      setMessage('Siswa berhasil didaftarkan ke kelas.');
      setSelectedStudent('');
      loadEnrollments(selectedClass);
    }
    setSaving(false);
  }

  async function handleRemove(id) {
    if (!confirm('Keluarkan siswa ini dari kelas?')) return;
    await supabase.from('enrollments').delete().eq('id', id);
    loadEnrollments(selectedClass);
  }

  if (loading) return <main className="p-6 text-center text-ink/60">Memuat...</main>;

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <h1 className="font-serif text-xl font-semibold text-pineDark mb-1">Panel Admin</h1>
      <p className="text-sm text-ink/60 mb-4">Daftarkan siswa ke kelas</p>
      <AdminNav role={profile.role} />

      <div className="bg-white rounded-xl border border-black/5 shadow-sm p-4 space-y-3 mb-8">
        <p className="font-medium text-sm">Pilih kelas</p>
        <select
          value={selectedClass}
          onChange={(e) => handleClassChange(e.target.value)}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        >
          <option value="">-- Pilih kelas --</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {selectedClass && (
          <form onSubmit={handleAdd} className="space-y-3 pt-2 border-t border-black/5">
            <select
              required
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            >
              <option value="">Pilih siswa untuk didaftarkan</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>

            {message && <p className="text-sm text-clay">{message}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-pine hover:bg-pineDark text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Daftarkan Siswa'}
            </button>
          </form>
        )}
      </div>

      {selectedClass && (
        <>
          <p className="font-medium text-sm mb-2">Siswa terdaftar di kelas ini</p>
          <div className="space-y-2">
            {enrollments.length === 0 && <p className="text-sm text-ink/60">Belum ada siswa.</p>}
            {enrollments.map((en) => (
              <div key={en.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-3 flex justify-between items-center">
                <p className="text-sm">{en.profiles?.full_name}</p>
                <button onClick={() => handleRemove(en.id)} className="text-clay text-sm underline underline-offset-2">
                  Keluarkan
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
