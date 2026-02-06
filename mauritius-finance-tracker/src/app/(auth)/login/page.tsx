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
      <div className="space-y-3">
        <button
          onClick={async () => {
            try {
              window.location.href = '/api/auth/google';
            } catch (e) {
              // noop
            }
          }}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 hover:shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.9 0 6.6 1.7 8.2 3.1l6-5.8C34.8 4 29.8 2 24 2 14.6 2 6.9 7.2 3.6 15.2l7.4 5.7C12 15 17.5 9.5 24 9.5z" />
            <path fill="#34A853" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8.1h12.8c-.6 3.6-3.1 6.5-6.6 8.3l6.5 5c3.8-3.5 6-8.9 6-15.3z" />
            <path fill="#4A90E2" d="M10.9 29.1A14.6 14.6 0 0 1 9.5 24c0-1.4.2-2.8.5-4.1L3 14.2A23.9 23.9 0 0 0 0 24c0 3.9.9 7.6 2.6 10.9l8.3-5.8z" />
            <path fill="#FBBC05" d="M24 46c6.5 0 11.9-2.1 15.9-5.7l-7.6-5.8c-2 1.4-4.6 2.4-8.3 2.4-6.3 0-11.7-4.2-13.6-9.9l-8.3 5.8C6.9 40.8 14.6 46 24 46z" />
          </svg>
          <span className="text-sm font-medium">Continue with Google</span>
        </button>
        <button
          onClick={async () => {
            try {
              window.location.href = '/api/auth/github';
            } catch (e) {
              // noop
            }
          }}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-900 text-white px-4 py-2 hover:opacity-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 .5C5.73.5.85 5.38.85 11.64c0 4.7 3.04 8.68 7.26 10.09.53.1.72-.23.72-.51 0-.25-.01-.92-.01-1.8-2.95.64-3.58-1.42-3.58-1.42-.48-1.22-1.17-1.54-1.17-1.54-.96-.66.07-.65.07-.65 1.06.08 1.62 1.09 1.62 1.09.94 1.61 2.47 1.14 3.07.87.09-.67.37-1.14.67-1.4-2.36-.27-4.84-1.18-4.84-5.27 0-1.16.41-2.11 1.08-2.86-.11-.27-.47-1.36.1-2.84 0 0 .88-.28 2.88 1.08a10.03 10.03 0 0 1 2.62-.35c.89 0 1.78.12 2.62.35 2-.36 2.88-1.08 2.88-1.08.57 1.48.21 2.57.1 2.84.67.75 1.08 1.7 1.08 2.86 0 4.1-2.49 5-4.86 5.26.38.33.72.98.72 1.99 0 1.44-.01 2.6-.01 2.95 0 .28.19.61.73.51 4.23-1.41 7.27-5.39 7.27-10.09C23.15 5.38 18.27.5 12 .5z" />
          </svg>
          <span className="text-sm font-medium">Continue with GitHub</span>
        </button>
        <div className="text-center text-sm text-slate-400">or</div>
      </div>
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
