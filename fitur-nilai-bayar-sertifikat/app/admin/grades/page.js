'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentProfile } from '@/lib/auth';
import AdminNav from '@/components/AdminNav';

export default function AdminGradesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [semester, setSemester] = useState('');
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({}); // { studentId: { mid, final, notes } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const p = await getCurrentProfile();
    if (!p) return router.push('/');
    if (!['admin', 'super_admin', 'teacher'].includes(p.role)) return router.push('/dashboard');
    setProfile(p);

    let classQuery = supabase.from('classes').select('*');
    if (p.role === 'teacher') classQuery = classQuery.eq('teacher_id', p.id);
    const { data: classData } = await classQuery;
    setClasses(classData || []);

    setLoading(false);
  }

  async function loadClassStudents(classId, sem) {
    if (!classId || !sem) return;

    const { data: enrollData } = await supabase
      .from('enrollments')
      .select('profiles(id, full_name)')
      .eq('class_id', classId);

    const studentList = (enrollData || []).map((e) => e.profiles).filter(Boolean);
    setStudents(studentList);

    const { data: gradeData } = await supabase
      .from('grades')
      .select('*')
      .eq('class_id', classId)
      .eq('semester', sem);

    const scoreMap = {};
    studentList.forEach((s) => {
      const existing = (gradeData || []).find((g) => g.student_id === s.id);
      scoreMap[s.id] = {
        mid: existing?.mid_score ?? '',
        final: existing?.final_score ?? '',
        notes: existing?.notes ?? '',
      };
    });
    setScores(scoreMap);
  }

  function handleClassOrSemesterChange(nextClass, nextSemester) {
    setSelectedClass(nextClass);
    setSemester(nextSemester);
    setMessage('');
    loadClassStudents(nextClass, nextSemester);
  }

  function updateScore(studentId, field, value) {
    setScores((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  }

  async function handleSaveAll() {
    setSaving(true);
    setMessage('');

    const rows = students.map((s) => ({
      student_id: s.id,
      class_id: selectedClass,
      semester,
      mid_score: scores[s.id]?.mid === '' ? null : Number(scores[s.id]?.mid),
      final_score: scores[s.id]?.final === '' ? null : Number(scores[s.id]?.final),
      notes: scores[s.id]?.notes || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('grades')
      .upsert(rows, { onConflict: 'student_id,class_id,semester' });

    if (error) {
      setMessage('Gagal menyimpan: ' + error.message);
    } else {
      setMessage('Nilai berhasil disimpan.');
    }
    setSaving(false);
  }

  if (loading) return <main className="p-6 text-center text-ink/60">Memuat...</main>;

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <h1 className="font-serif text-xl font-semibold text-pineDark mb-1">Panel Admin</h1>
      <p className="text-sm text-ink/60 mb-4">Input nilai Mid Test & Final Test</p>
      <AdminNav role={profile.role} />

      <div className="bg-white rounded-xl border border-black/5 shadow-sm p-4 space-y-3 mb-6">
        <select
          value={selectedClass}
          onChange={(e) => handleClassOrSemesterChange(e.target.value, semester)}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        >
          <option value="">-- Pilih kelas --</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <input
          placeholder="Semester (contoh: Semester 1 2026)"
          value={semester}
          onBlur={(e) => handleClassOrSemesterChange(selectedClass, e.target.value)}
          onChange={(e) => setSemester(e.target.value)}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
      </div>

      {selectedClass && semester && (
        <>
          {students.length === 0 ? (
            <p className="text-sm text-ink/60">Belum ada siswa terdaftar di kelas ini.</p>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {students.map((s) => (
                  <div key={s.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
                    <p className="font-medium mb-2">{s.full_name}</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="number"
                        placeholder="Nilai Mid"
                        value={scores[s.id]?.mid ?? ''}
                        onChange={(e) => updateScore(s.id, 'mid', e.target.value)}
                        className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Nilai Final"
                        value={scores[s.id]?.final ?? ''}
                        onChange={(e) => updateScore(s.id, 'final', e.target.value)}
                        className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                      />
                    </div>
                    <input
                      placeholder="Catatan (opsional)"
                      value={scores[s.id]?.notes ?? ''}
                      onChange={(e) => updateScore(s.id, 'notes', e.target.value)}
                      className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>

              {message && <p className="text-sm text-clay mb-2">{message}</p>}

              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="w-full bg-pine hover:bg-pineDark text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan Semua Nilai'}
              </button>
            </>
          )}
        </>
      )}
    </main>
  );
}
