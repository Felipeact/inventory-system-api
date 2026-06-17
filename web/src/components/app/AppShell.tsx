"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, Loader2 } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useAuth, roleIsAdmin } from "@/lib/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-50">
        <Loader2 size={28} className="animate-spin text-brand-600" />
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const initials = user.name
    ? user.name.split(" ").map((p) => p[0]).join("").slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-100 bg-white/80 px-5 backdrop-blur">
          <button
            className="btn-ghost p-2 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-ink-900">{user.name || user.email}</p>
              <p className="text-xs text-ink-500">
                {user.role}
                {roleIsAdmin(user.role) ? " · Admin" : ""}
              </p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {initials}
            </span>
            <button
              onClick={handleLogout}
              className="btn-ghost p-2"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
