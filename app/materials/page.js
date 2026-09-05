'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function MaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push('/');
      return;
    }
    const userId = sessionData.session.user.id;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    let classIds = [];
    if (profileData.role === 'teacher') {
      const { data } = await supabase.from('classes').select('id').eq('teacher_id', userId);
      classIds = (data || []).map((c) => c.id);
    } else {
      const { data } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('student_id', userId);
      classIds = (data || []).map((e) => e.class_id);
    }

    if (classIds.length > 0) {
      const { data } = await supabase
        .from('materials')
        .select('*, classes(name)')
        .in('class_id', classIds)
        .order('created_at', { ascending: false });
      setMaterials(data || []);
    }

    setLoading(false);
  }

  if (loading) {
    return <main className="p-6 text-center text-ink/60">Memuat...</main>;
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <h1 className="font-serif text-xl font-semibold text-pineDark mb-6">Materi Belajar</h1>

      {materials.length === 0 && (
        <p className="text-sm text-ink/60">Belum ada materi yang diunggah untuk kelasmu.</p>
      )}

      <div className="space-y-3">
        {materials.map((m) => (
          <div key={m.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
            <p className="text-xs text-pine/70 mb-1">{m.classes?.name}</p>
            <p className="font-medium mb-1">{m.title}</p>
            {m.description && <p className="text-sm text-ink/70 mb-2">{m.description}</p>}
            <div className="flex gap-3 text-sm">
              {m.file_url && (
                <a href={m.file_url} target="_blank" rel="noreferrer" className="text-pine underline underline-offset-2">
                  Buka file
                </a>
              )}
              {m.link_url && (
                <a href={m.link_url} target="_blank" rel="noreferrer" className="text-pine underline underline-offset-2">
                  Buka link
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
