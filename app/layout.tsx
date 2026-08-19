import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Артём | Панель Управления Telegram-ботом",
  description: "Панель управления и настройка ИИ-бота Артёма для Telegram (Gemini AI)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body className="antialiased bg-[#090d16] text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
