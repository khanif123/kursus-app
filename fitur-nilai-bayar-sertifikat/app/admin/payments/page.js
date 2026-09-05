'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentProfile } from '@/lib/auth';
import AdminNav from '@/components/AdminNav';

const STATUS_LABEL = {
  pending: 'Menunggu',
  confirmed: 'Terkonfirmasi',
  rejected: 'Ditolak',
};

const STATUS_STYLE = {
  pending: 'bg-mustard/20 text-pineDark',
  confirmed: 'bg-pine/15 text-pine',
  rejected: 'bg-clay/15 text-clay',
};

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const p = await getCurrentProfile();
    if (!p) return router.push('/');
    if (!['admin', 'super_admin'].includes(p.role)) return router.push('/dashboard');
    setProfile(p);
    await loadPayments();
    setLoading(false);
  }

  async function loadPayments() {
    const { data } = await supabase
      .from('payments')
      .select('*, profiles(full_name)')
      .order('submitted_at', { ascending: false });
    setPayments(data || []);
  }

  async function handleViewProof(path) {
    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(path, 60 * 5);
    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  }

  async function handleUpdateStatus(id, status) {
    const { data: sessionData } = await supabase.auth.getSession();
    await supabase
      .from('payments')
      .update({
        status,
        confirmed_by: sessionData.session.user.id,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', id);
    loadPayments();
  }

  if (loading) return <main className="p-6 text-center text-ink/60">Memuat...</main>;

  const visible = payments.filter((p) => filter === 'all' || p.status === filter);

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <h1 className="font-serif text-xl font-semibold text-pineDark mb-1">Panel Admin</h1>
      <p className="text-sm text-ink/60 mb-4">Konfirmasi pembayaran siswa</p>
      <AdminNav role={profile.role} />

      <div className="flex gap-2 mb-4">
        {['pending', 'confirmed', 'rejected', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              filter === f ? 'bg-pine text-white border-pine' : 'border-black/10 text-ink/70'
            }`}
          >
            {f === 'all' ? 'Semua' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {visible.length === 0 && <p className="text-sm text-ink/60">Tidak ada data.</p>}

      <div className="space-y-3">
        {visible.map((pay) => (
          <div key={pay.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className="font-medium">{pay.profiles?.full_name}</p>
                <p className="text-sm text-ink/60">{pay.period}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[pay.status]}`}>
                {STATUS_LABEL[pay.status]}
              </span>
            </div>
            {pay.amount && <p className="text-sm text-ink/60 mb-1">Rp {Number(pay.amount).toLocaleString('id-ID')}</p>}
            {pay.proof_path && (
              <button
                onClick={() => handleViewProof(pay.proof_path)}
                className="text-sm text-pine underline underline-offset-2 block mb-2"
              >
                Lihat bukti transfer
              </button>
            )}
            {pay.status === 'pending' && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleUpdateStatus(pay.id, 'confirmed')}
                  className="flex-1 bg-pine hover:bg-pineDark text-white rounded-lg py-1.5 text-sm font-medium"
                >
                  Konfirmasi
                </button>
                <button
                  onClick={() => handleUpdateStatus(pay.id, 'rejected')}
                  className="flex-1 bg-white border border-clay text-clay rounded-lg py-1.5 text-sm font-medium"
                >
                  Tolak
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
