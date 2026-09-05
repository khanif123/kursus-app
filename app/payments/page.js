'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentProfile } from '@/lib/auth';

const STATUS_LABEL = {
  pending: 'Menunggu konfirmasi',
  confirmed: 'Terkonfirmasi',
  rejected: 'Ditolak',
};

const STATUS_STYLE = {
  pending: 'bg-mustard/20 text-pineDark',
  confirmed: 'bg-pine/15 text-pine',
  rejected: 'bg-clay/15 text-clay',
};

export default function PaymentsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ period: '', amount: '', file: null });

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const p = await getCurrentProfile();
    if (!p) return router.push('/');
    setProfile(p);
    await loadPayments(p.id);
    setLoading(false);
  }

  async function loadPayments(studentId) {
    const result = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });
    setPayments(result.data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    let proofPath = null;

    if (form.file) {
      const fileExt = form.file.name.split('.').pop();
      const filePath = profile.id + '/' + Date.now() + '.' + fileExt;
      const uploadResult = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, form.file);

      if (uploadResult.error) {
        setMessage('Gagal upload bukti transfer: ' + uploadResult.error.message);
        setSaving(false);
        return;
      }
      proofPath = filePath;
    }

    const insertResult = await supabase.from('payments').insert({
      student_id: profile.id,
      period: form.period,
      amount: form.amount ? Number(form.amount) : null,
      proof_path: proofPath,
    });

    if (insertResult.error) {
      setMessage('Gagal mengirim: ' + insertResult.error.message);
    } else {
      setMessage('Bukti pembayaran berhasil dikirim. Menunggu konfirmasi admin.');
      setForm({ period: '', amount: '', file: null });
      loadPayments(profile.id);
    }
    setSaving(false);
  }

  async function handleViewProof(path) {
    const result = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(path, 300);
    if (!result.error && result.data && result.data.signedUrl) {
      window.open(result.data.signedUrl, '_blank');
    }
  }

  if (loading) return <main className="p-6 text-center text-ink/60">Memuat...</main>;

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <Link href="/dashboard" className="text-sm text-pine underline underline-offset-2">
        &larr; Kembali
      </Link>
      <h1 className="font-serif text-xl font-semibold text-pineDark mt-3 mb-1">Pembayaran</h1>
      <p className="text-sm text-ink/60 mb-6">Kirim bukti transfer and lihat status</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-black/5 shadow-sm p-4 space-y-3 mb-8">
        <p className="font-medium text-sm">Kirim bukti pembayaran baru</p>

        <input
          required
          placeholder="Periode (contoh: Oktober 2026)"
          value={form.period}
          onChange={(e) => setForm({ ...form, period: e.target.value })}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />

        <input
          type="number"
          placeholder="Nominal (opsional)"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />

        <div>
          <label className="block text-sm font-medium mb-1">Bukti transfer (foto/PDF)</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setForm({ ...form, file: e.target.files[0] || null })}
            className="w-full text-sm"
          />
        </div>

        {message && <p className="text-sm text-clay">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-pine hover:bg-pineDark text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
        </button>
      </form>

      <p className="font-medium text-sm mb-2">Riwayat pembayaran</p>
      {payments.length === 0 && <p className="text-sm text-ink/60">Belum ada pembayaran yang dikirim.</p>}
      <div className="space-y-2">
        {payments.map((pay) => (
          <div key={pay.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
            <div className="flex justify-between items-start mb-1">
              <p className="font-medium">{pay.period}</p>
              <span className={'text-xs px-2 py-0.5 rounded-full ' + STATUS_STYLE[pay.status]}>
                {STATUS_LABEL[pay.status]}
              </span>
            </div>
            {pay.amount && <p className="text-sm text-ink/60">Rp {Number(pay.amount).toLocaleString('id-ID')}</p>}
            {pay.proof_path && (
              <button
                onClick={() => handleViewProof(pay.proof_path)}
                className="text-sm text-pine underline underline-offset-2 mt-1"
              >
                Lihat bukti transfer
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
