import './globals.css';

export const metadata = {
  title: 'Kursus Bahasa Inggris',
  description: 'Presensi, materi, dan progress belajar kursus bahasa Inggris',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Source+Serif+4:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-canvas text-ink font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
