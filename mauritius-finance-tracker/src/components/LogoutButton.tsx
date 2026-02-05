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
      className="text-sm font-medium text-slate-600 hover:text-slate-900"
    >
      Log out
    </button>
  );
}
