'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
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
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(profileData);

    if (profileData?.role === 'teacher') {
      const { data } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', userId);
      setClasses(data || []);
    } else {
      const { data } = await supabase
        .from('enrollments')
        .select('classes(*)')
        .eq('student_id', userId);
      setClasses((data || []).map((e) => e.classes).filter(Boolean));
    }

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return <main className="p-6 text-center text-ink/60">Memuat...</main>;
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-ink/60">
            {profile?.role === 'super_admin' ? 'Super Admin' :
             profile?.role === 'admin' ? 'Admin' :
             profile?.role === 'teacher' ? 'Guru' : 'Siswa'}
          </p>
          <h1 className="font-serif text-xl font-semibold text-pineDark">
            {profile?.full_name}
          </h1>
        </div>
        <button onClick={handleLogout} className="text-sm text-clay underline underline-offset-2">
          Keluar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Link
          href="/attendance"
          className="bg-pine text-white rounded-xl p-4 text-center font-medium hover:bg-pineDark transition-colors"
        >
          Absen Hari Ini
        </Link>
        <Link
          href="/materials"
          className="bg-white border border-black/10 rounded-xl p-4 text-center font-medium hover:border-pine transition-colors"
        >
          Materi Belajar
        </Link>
      </div>

      {['admin', 'super_admin', 'teacher'].includes(profile?.role) && (
        <Link
          href={profile.role === 'teacher' ? '/admin/schedules' : '/admin/classes'}
          className="block bg-mustard/15 border border-mustard/40 rounded-xl p-4 text-center font-medium text-pineDark mb-4 hover:bg-mustard/25 transition-colors"
        >
          Buka Panel Admin
        </Link>
      )}

      <div className="grid grid-cols-3 gap-2 mb-8">
        <Link
          href="/grades"
          className="bg-white border border-black/10 rounded-xl p-3 text-center text-sm font-medium hover:border-pine transition-colors"
        >
          Nilai
        </Link>
        <Link
          href="/payments"
          className="bg-white border border-black/10 rounded-xl p-3 text-center text-sm font-medium hover:border-pine transition-colors"
        >
          Pembayaran
        </Link>
        <Link
          href="/certificates"
          className="bg-white border border-black/10 rounded-xl p-3 text-center text-sm font-medium hover:border-pine transition-colors"
        >
          Sertifikat
        </Link>
      </div>

      <h2 className="font-serif font-semibold text-pineDark mb-3">
        {profile?.role === 'teacher' ? 'Kelas yang kamu ajar' : 'Kelas kamu'}
      </h2>

      {classes.length === 0 && (
        <p className="text-sm text-ink/60">
          Belum ada kelas terdaftar. Hubungi admin untuk didaftarkan ke kelas.
        </p>
      )}

      <div className="space-y-2">
        {classes.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
            <p className="font-medium">{c.name}</p>
            {c.level && <p className="text-sm text-ink/60">Level: {c.level}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
