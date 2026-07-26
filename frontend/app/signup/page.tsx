"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { api, setToken } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.signup(name, email, password);
      setToken(res.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <Navbar />
      <div className="max-w-md mx-auto px-6 pt-20">
        <h1 className="font-display text-3xl font-semibold text-ink mb-1">Create your shelf</h1>
        <p className="text-muted text-sm mb-8">One account, every course you upload.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-line rounded-sm px-3 py-2.5 bg-surface focus:border-cover outline-none"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-line rounded-sm px-3 py-2.5 bg-surface focus:border-cover outline-none"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-line rounded-sm px-3 py-2.5 bg-surface focus:border-cover outline-none"
            />
          </Field>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper py-2.5 rounded-sm font-medium hover:bg-cover transition disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-muted mt-6">
          Already have one?{" "}
          <Link href="/login" className="text-cover font-medium">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-wide text-muted mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
