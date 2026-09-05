'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentProfile } from '@/lib/auth';

export default function CertificatesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const p = await getCurrentProfile();
    if (!p) return router.push('/');
    setProfile(p);

    const { data } = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', p.id)
      .order('uploaded_at', { ascending: false });

    setCertificates(data || []);
    setLoading(false);
  }

  async function handleDownload(path) {
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
      <Link href="/dashboard" className="text-sm text-pine underline underline-offset-2">
        &larr; Kembali
      </Link>
      <h1 className="font-serif text-xl font-semibold text-pineDark mt-3 mb-1">Sertifikat Saya</h1>
      <p className="text-sm text-ink/60 mb-6">Kumpulan sertifikat tiap semester</p>

      {certificates.length === 0 && (
        <p className="text-sm text-ink/60">Belum ada sertifikat yang diunggah admin.</p>
      )}

      <div className="space-y-2">
        {certificates.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-pine/70">{c.semester}</p>
              <p className="font-medium">{c.title}</p>
              {c.level && <p className="text-xs text-mustard font-medium mt-0.5">Level {c.level}</p>}
            </div>
            <button
              onClick={() => handleDownload(c.file_path)}
              className="text-sm text-pine underline underline-offset-2"
            >
              Unduh
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
