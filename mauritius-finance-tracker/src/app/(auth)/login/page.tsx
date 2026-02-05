"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginSchema } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    const formData = new FormData(event.currentTarget);

    const payload = {
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    };

    const validated = loginSchema.safeParse(payload);
    if (!validated.success) {
      const flat = validated.error.flatten().fieldErrors;
      const errors: Record<string, string> = {};
      if (flat.email?.[0]) errors.email = flat.email[0];
      if (flat.password?.[0]) errors.password = flat.password[0];
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const token = document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute("content");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-csrf-token": token } : {}),
      },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Login failed.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Welcome back</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            name="email"
            type="email"
            required
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2"
          />
          {fieldErrors.email && (
            <p className="text-xs text-rose-600 mt-1">{fieldErrors.email}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            name="password"
            type="password"
            required
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2"
          />
          {fieldErrors.password && (
            <p className="text-xs text-rose-600 mt-1">{fieldErrors.password}</p>
          )}
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-slate-900 text-white py-2 font-medium"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="text-sm text-slate-500">
        New here?{" "}
        <a className="text-slate-900 font-medium" href="/register">
          Create an account
        </a>
      </p>
    </div>
  );
}
