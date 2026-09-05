'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav({ role }) {
  const pathname = usePathname();

  const links = [
    { href: '/admin/classes', label: 'Kelas', roles: ['admin', 'super_admin'] },
    { href: '/admin/schedules', label: 'Jadwal', roles: ['admin', 'super_admin', 'teacher'] },
    { href: '/admin/enrollments', label: 'Daftarkan Siswa', roles: ['admin', 'super_admin'] },
    { href: '/admin/materials', label: 'Materi', roles: ['admin', 'super_admin', 'teacher'] },
    { href: '/admin/grades', label: 'Nilai', roles: ['admin', 'super_admin', 'teacher'] },
    { href: '/admin/payments', label: 'Pembayaran', roles: ['admin', 'super_admin'] },
    { href: '/admin/certificates', label: 'Sertifikat', roles: ['admin', 'super_admin'] },
    { href: '/admin/users', label: 'Pengguna', roles: ['super_admin'] },
  ];

  const visible = links.filter((l) => l.roles.includes(role));

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-6 px-6">
      {visible.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`whitespace-nowrap text-sm px-3 py-1.5 rounded-full border transition-colors ${
            pathname === l.href
              ? 'bg-pine text-white border-pine'
              : 'border-black/10 text-ink/70 hover:border-pine'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
