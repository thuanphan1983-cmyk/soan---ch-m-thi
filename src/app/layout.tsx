import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hệ Thống Soạn Đề Toán THPT | Chuẩn Bộ GD&ĐT',
  description: 'Ứng dụng soạn đề thi Toán THPT tự động bằng AI, chuẩn chương trình GDPT 2018, hỗ trợ xuất Word với công thức, bảng biến thiên và đồ thị.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          integrity="sha384-nB0miv6/jRmo5YADR2eJMhqKbK1hwG4QzDa9MialBUp7kaGGPM2M/X3bYwNnFe5J"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        {children}
      </body>
    </html>
  );
}
