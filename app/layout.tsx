import "./globals.css";
import type { Metadata } from "next";
import RoutineForgeChatbot from "@/components/chatbot/RoutineForgeChatbot";

export const metadata: Metadata = {
  title: "RoutineForge",
  description: "Plan your day. Eat better. Train smarter.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-zinc-900 antialiased">
        {children}
        <RoutineForgeChatbot />
      </body>
    </html>
  );
}
