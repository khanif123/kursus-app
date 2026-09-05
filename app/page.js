'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' atau 'daftar'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/dashboard');
    });
  }, [router]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('Email atau kata sandi salah.');
      return;
    }
    router.push('/dashboard');
  }

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        full_name: fullName,
        role,
      });
      if (profileError) {
        setLoading(false);
        setError(profileError.message);
        return;
      }
    }

    setLoading(false);
    router.push('/dashboard');
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-sm tracking-wide text-pine/70 mb-1">Kursus Bahasa Inggris</p>
          <h1 className="font-serif text-2xl font-semibold text-pineDark">
            {mode === 'login' ? 'Masuk ke akun kamu' : 'Buat akun baru'}
          </h1>
        </div>

        <form
          onSubmit={mode === 'login' ? handleLogin : handleSignup}
          className="bg-white rounded-xl border border-black/5 shadow-sm p-6 space-y-4"
        >
          {mode === 'daftar' && (
            <div>
              <label className="block text-sm font-medium mb-1">Nama lengkap</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-black/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pine"
                placeholder="Nama sesuai KTP/rapor"
              />
            </div>
          )}

          {mode === 'daftar' && (
            <div>
              <label className="block text-sm font-medium mb-1">Daftar sebagai</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-black/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pine"
              >
                <option value="student">Siswa</option>
                <option value="teacher">Guru</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pine"
              placeholder="nama@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kata sandi</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pine"
              placeholder="Minimal 6 karakter"
            />
          </div>

          {error && <p className="text-clay text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pine hover:bg-pineDark transition-colors text-white rounded-lg py-2.5 font-medium disabled:opacity-60"
          >
            {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </button>
        </form>

        <p className="text-center text-sm mt-5 text-ink/70">
          {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'daftar' : 'login');
              setError('');
            }}
            className="text-pine font-medium underline underline-offset-2"
          >
            {mode === 'login' ? 'Daftar di sini' : 'Masuk di sini'}
          </button>
        </p>
      </div>
    </main>
  );
}
