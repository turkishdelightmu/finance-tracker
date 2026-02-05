import type { ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/bills", label: "Bills" },
  { href: "/goals", label: "Goals" },
  { href: "/loans", label: "Loans" },
  { href: "/investments", label: "Investments" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-4 flex items-center justify-between bg-white/70 backdrop-blur border-b border-slate-200">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Mauritius</p>
          <h1 className="text-lg font-semibold">Finance Tracker</h1>
          <p className="text-sm text-slate-500">Hello {user.name || user.email}</p>
        </div>
        <LogoutButton />
      </header>

      <main className="flex-1 px-4 py-6 max-w-5xl w-full mx-auto">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 border-t border-slate-200 md:static md:border-t-0 md:border-b md:bg-transparent">
        <div className="max-w-5xl mx-auto flex justify-between md:justify-start gap-4 px-4 py-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs md:text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
