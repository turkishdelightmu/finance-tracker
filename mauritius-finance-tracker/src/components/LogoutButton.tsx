"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const token = document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute("content");
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: token ? { "x-csrf-token": token } : {},
    });
    router.push("/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
    >
      Log out
    </button>
  );
}
