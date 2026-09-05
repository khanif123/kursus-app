'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { distanceInMeters } from '@/lib/geo';

export default function AttendancePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [checkingId, setCheckingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
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

    const today = new Date().toISOString().slice(0, 10);

    let classIds = [];
    if (profileData.role === 'teacher') {
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', userId);
      classIds = (classes || []).map((c) => c.id);
    } else {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('student_id', userId);
      classIds = (enrollments || []).map((e) => e.class_id);
    }

    if (classIds.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const { data: schedules } = await supabase
      .from('schedules')
      .select('*, classes(id, name, location_lat, location_lng, radius_meters)')
      .in('class_id', classIds)
      .eq('session_date', today);

    const { data: existingAttendance } = await supabase
      .from('attendance')
      .select('schedule_id, status')
      .eq('user_id', userId);

    const attendanceMap = {};
    (existingAttendance || []).forEach((a) => {
      attendanceMap[a.schedule_id] = a.status;
    });

    const merged = (schedules || []).map((s) => ({
      ...s,
      alreadyChecked: attendanceMap[s.id] || null,
    }));

    setSessions(merged);
    setLoading(false);
  }

  async function handleCheckIn(schedule) {
    setCheckingId(schedule.id);
    setMessage('');

    if (!navigator.geolocation) {
      setMessage('Perangkat/browser ini tidak mendukung deteksi lokasi.');
      setCheckingId(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const classInfo = schedule.classes;

        let status = 'hadir';
        let distance = null;

        if (classInfo?.location_lat && classInfo?.location_lng) {
          distance = distanceInMeters(
            latitude,
            longitude,
            classInfo.location_lat,
            classInfo.location_lng
          );
          const radius = classInfo.radius_meters || 150;
          if (distance > radius) {
            setMessage(
              `Kamu berada ${Math.round(distance)}m dari lokasi kelas (batas ${radius}m). Presensi tidak tercatat karena di luar jangkauan.`
            );
            setCheckingId(null);
            return;
          }
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session.user.id;

        const { error } = await supabase.from('attendance').insert({
          schedule_id: schedule.id,
          user_id: userId,
          status,
          lat: latitude,
          lng: longitude,
          distance_meters: distance,
        });

        if (error) {
          setMessage('Gagal menyimpan presensi: ' + error.message);
        } else {
          setMessage('Presensi berhasil dicatat. Terima kasih!');
          loadData();
        }
        setCheckingId(null);
      },
      (err) => {
        setMessage('Tidak bisa mengambil lokasi. Pastikan izin lokasi diaktifkan.');
        setCheckingId(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (loading) {
    return <main className="p-6 text-center text-ink/60">Memuat...</main>;
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <h1 className="font-serif text-xl font-semibold text-pineDark mb-1">Presensi hari ini</h1>
      <p className="text-sm text-ink/60 mb-6">
        Halo, {profile?.full_name}. Pastikan kamu berada di lokasi kelas sebelum absen.
      </p>

      {message && (
        <div className="mb-4 rounded-lg bg-mustard/15 border border-mustard/40 px-4 py-3 text-sm">
          {message}
        </div>
      )}

      {sessions.length === 0 && (
        <p className="text-ink/60 text-sm">Tidak ada jadwal kelas untuk hari ini.</p>
      )}

      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-black/5 shadow-sm p-4">
            <p className="font-medium">{s.classes?.name}</p>
            <p className="text-sm text-ink/60 mb-3">
              {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
            </p>

            {s.alreadyChecked ? (
              <span className="inline-block text-sm bg-pine/10 text-pineDark px-3 py-1 rounded-full">
                Sudah absen ({s.alreadyChecked})
              </span>
            ) : (
              <button
                onClick={() => handleCheckIn(s)}
                disabled={checkingId === s.id}
                className="w-full bg-pine hover:bg-pineDark transition-colors text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
              >
                {checkingId === s.id ? 'Mengecek lokasi...' : 'Absen sekarang'}
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
