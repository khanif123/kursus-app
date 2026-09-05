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
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });
    setPayments(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    let proofPath = null;

    if (form.file) {
      const fileExt = form.file.name.split('.').pop();
      const filePath = `${profile.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, form.file);

      if (uploadError) {
        setMessage('Gagal upload bukti transfer: ' + uploadError.message);
        setSaving(false);
        return;
      }
      proofPath = filePath;
    }

    const { error } = await supabase.from('payments').insert({
