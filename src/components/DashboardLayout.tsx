import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import type { Role } from "@prisma/client";
import type { ReactNode } from "react";

export function DashboardLayout({
  user,
  children,
  currentPath
}: {
  user: { firstName: string; lastName: string; role: Role };
  children: ReactNode;
  currentPath?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar user={user} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Sidebar role={user.role} currentPath={currentPath} />
        <main className="min-w-0 flex-1 px-4 py-6 pb-12 sm:px-6 lg:px-8 lg:pb-14">
          {children}
        </main>
      </div>
    </div>
  );
}
