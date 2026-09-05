'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentProfile } from '@/lib/auth';

export default function GradesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const p = await getCurrentProfile();
    if (!p) return router.push('/');
    setProfile(p);

    const { data } = await supabase
      .from('grades')
      .select('*, classes(name, level)')
      .eq('student_id', p.id)
      .order('semester', { ascending: false });

    setGrades(data || []);
    setLoading(false);
  }

  if (loading) return <main className="p-6 text-center text-ink/60">Memuat...</main>;

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <Link href="/dashboard" className="text-sm text-pine underline underline-offset-2">
        &larr; Kembali
      </Link>
      <h1 className="font-serif text-xl font-semibold text-pineDark mt-3 mb-1">Nilai Saya</h1>
      <p className="text-sm text-ink/60 mb-6">Mid Test & Final Test tiap kelas</p>

      {grades.length === 0 && (
        <p className="text-sm text-ink/60">Belum ada nilai yang diinput guru.</p>
      )}

      <div className="space-y-3">
        {grades.map((g) => (
          <div key={g.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
            <p className="text-xs text-pine/70">{g.semester}</p>
            <p className="font-medium mb-2">{g.classes?.name}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-canvas rounded-lg p-2 text-center">
                <p className="text-xs text-ink/50">Mid Test</p>
                <p className="font-semibold text-pineDark">{g.mid_score ?? '-'}</p>
              </div>
              <div className="bg-canvas rounded-lg p-2 text-center">
                <p className="text-xs text-ink/50">Final Test</p>
                <p className="font-semibold text-pineDark">{g.final_score ?? '-'}</p>
              </div>
            </div>
            {g.notes && <p className="text-sm text-ink/60 mt-2">{g.notes}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
