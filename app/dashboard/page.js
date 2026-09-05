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
    return <main className="p-6 text-center
