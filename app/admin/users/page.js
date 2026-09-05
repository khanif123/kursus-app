'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentProfile } from '@/lib/auth';
import AdminNav from '@/components/AdminNav';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  teacher: 'Guru',
  student: 'Siswa',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const p = await getCurrentProfile();
    if (!p) return router.push('/');
    if (p.role !== 'super_admin') return router.push('/dashboard');
    setProfile(p);
    await loadUsers();
    setLoading(false);
  }

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setUsers(data || []);
  }

  async function handleRoleChange(userId, newRole) {
    setSavingId(userId);
    setMessage('');
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) {
      setMessage('Gagal ubah role: ' + error.message);
    } else {
      loadUsers();
    }
    setSavingId(null);
  }

  if (loading) return <main className="p-6 text-center text-ink/60">Memuat...</main>;

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <h1 className="font-serif text-xl font-semibold text-pineDark mb-1">Panel Admin</h1>
      <p className="text-sm text-ink/60 mb-4">Kelola peran (role) pengguna</p>
      <AdminNav role={profile.role} />

      {message && <p className="text-sm text-clay mb-3">{message}</p>}

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4 flex justify-between items-center gap-3">
            <p className="text-sm font-medium">{u.full_name}</p>
            <select
              value={u.role}
              disabled={savingId === u.id || u.id === profile.id}
              onChange={(e) => handleRoleChange(u.id, e.target.value)}
              className="rounded-lg border border-black/10 px-2 py-1 text-sm disabled:opacity-50"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink/50 mt-4">
        Kamu tidak bisa mengubah role akunmu sendiri, demi keamanan.
      </p>
    </main>
  );
}
