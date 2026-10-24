import type { Metadata } from "next";
import "./globals.css";
import { ThemeToggleClient } from "./ThemeToggleClient";

export const metadata: Metadata = {
  title: "FoodHub — Hệ Sinh Thái Ẩm Thực & Thực Đơn Căn Tin Liên Trường",
  description:
    "Xem thực đơn điểm tâm sáng, bữa trưa, bảng xếp hạng Tier S/A/B, lọc dị ứng và trợ lý điền Form tuần.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        {/* Bộ đôi Font chữ Plus Jakarta Sans & Quicksand mềm mại, hiện đại */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Quicksand:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{`
          :root {
            --bg-main: #F4F7F9;
            --text-main: #1E293B;
          }

          body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: var(--bg-main);
            color: var(--text-main);
            letter-spacing: -0.01em;
            transition: background-color 0.3s ease, color 0.3s ease;
          }

          h1, h2, h3 {
            font-family: 'Quicksand', 'Plus Jakarta Sans', sans-serif;
            letter-spacing: -0.02em;
          }

          /* Làm mềm toàn bộ thẻ Card, Nút bấm và Ô nhập liệu (Soft UI) */
          section, .rounded-3xl, .rounded-2xl {
            box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.05);
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }

          input, select, textarea {
            transition: all 0.2s ease;
          }

          input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #0D9488 !important;
            box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
          }

          /* ================================================================
             CHẾ ĐỘ TỐI (DARK MODE) MỀM MẠI DỊU MẮT TRÊN TOÀN HỆ THỐNG
             ================================================================ */
          html.dark-theme body {
            background-color: #0B1120 !important;
            color: #E2E8F0 !important;
          }

          html.dark-theme .min-h-screen {
            background: #0B1120 !important;
            color: #E2E8F0 !important;
          }

          html.dark-theme header {
            background-color: rgba(15, 23, 42, 0.88) !important;
            backdrop-filter: blur(12px);
            border-color: #1E293B !important;
          }

          html.dark-theme .bg-white,
          html.dark-theme .bg-white\\/80 {
            background-color: #151F32 !important;
            border-color: #26354D !important;
            color: #F1F5F9 !important;
            box-shadow: 0 12px 32px -12px rgba(0, 0, 0, 0.5) !important;
          }

          html.dark-theme .bg-slate-50,
          html.dark-theme .bg-slate-50\\/50,
          html.dark-theme .bg-slate-50\\/70,
          html.dark-theme .bg-slate-100 {
            background-color: #0F172A !important;
            border-color: #1E293B !important;
            color: #CBD5E1 !important;
          }

          html.dark-theme .text-slate-900,
          html.dark-theme .text-slate-800,
          html.dark-theme .text-slate-700 {
            color: #F8FAFC !important;
          }

          html.dark-theme .text-slate-600,
          html.dark-theme .text-slate-500 {
            color: #94A3B8 !important;
          }

          html.dark-theme .border-slate-200,
          html.dark-theme .border-slate-200\\/80,
          html.dark-theme .border-slate-100 {
            border-color: #26354D !important;
          }

          html.dark-theme input,
          html.dark-theme select,
          html.dark-theme textarea {
            background-color: #0F172A !important;
            border-color: #334155 !important;
            color: #F8FAFC !important;
          }

          html.dark-theme input::placeholder,
          html.dark-theme textarea::placeholder {
            color: #64748B !important;
          }

          html.dark-theme .dark-toggle-btn {
            background-color: #1E293B !important;
            color: #F8FAFC !important;
            border-color: #334155 !important;
          }
        `}</style>
      </head>
      <body className="antialiased selection:bg-teal-600 selection:text-white">
        {children}
        <ThemeToggleClient />
      </body>
    </html>
  );
}