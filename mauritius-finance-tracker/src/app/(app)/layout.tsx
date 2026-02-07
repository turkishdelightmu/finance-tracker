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
  { href: "/comments", label: "Comments" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-5 md:py-8">
        <header className="glass rounded-3xl px-5 py-5 md:px-6 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">Mauritius</p>
              <h1 className="mt-1 text-xl font-semibold text-white md:text-2xl">Finance Tracker</h1>
              <p className="mt-1 text-sm text-slate-300">Hello {user.name || user.email}</p>
            </div>
            <LogoutButton />
          </div>
        </header>

        <main className="mt-5">{children}</main>
      </div>

      <nav className="fixed bottom-4 left-4 right-4 z-30 md:left-1/2 md:right-auto md:w-max md:-translate-x-1/2">
        <div className="glass rounded-2xl px-3 py-2">
          <div className="flex items-center justify-between gap-1 md:gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white md:text-sm"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
