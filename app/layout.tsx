import "./globals.css";
import type { Metadata } from "next";
import RoutineForgeChatbot from "@/components/chatbot/RoutineForgeChatbot";

export const metadata: Metadata = {
  title: "RoutineForge",
  description: "Plan your day. Eat better. Train smarter.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    var t = localStorage.getItem("rf_theme");
    if (!t) {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  } catch (e) {}
})();`,
          }}
        />
      </head>

      <body className="min-h-screen bg-white text-zinc-900 antialiased dark:bg-slate-950 dark:text-slate-50">
        {children}
        <RoutineForgeChatbot />
      </body>
    </html>
  );
}
