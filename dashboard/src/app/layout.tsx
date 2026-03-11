import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Rice Mill Dashboard | Operations Tracker",
  description: "Real-time dashboard for tracking rice mill operations, paddy procurement, quality metrics, and revenue analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="app-main">
          {children}
        </main>
      </body>
    </html>
  );
}
