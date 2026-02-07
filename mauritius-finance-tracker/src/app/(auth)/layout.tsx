import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] glass p-8">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">Mauritius</p>
          <h1 className="text-2xl font-semibold text-white">
            Mauritius Personal Finance Tracker
          </h1>
          <p className="text-sm text-slate-300 mt-2">
            Stay on top of spending, bills, goals, and investments.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
