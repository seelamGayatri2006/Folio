"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/api";
import { BookMarked, LogOut } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const loggedIn = typeof window !== "undefined" && !!getToken();

  function handleLogout() {
    clearToken();
    router.push("/");
  }

  return (
    <nav className="border-b border-line bg-paper/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href={loggedIn ? "/dashboard" : "/"} className="flex items-center gap-2">
          <BookMarked size={22} className="text-cover" strokeWidth={2.2} />
          <span className="font-display font-semibold text-lg tracking-tight text-ink">Folio</span>
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium">
          {loggedIn ? (
            <>
              <Link href="/dashboard" className="text-ink/80 hover:text-ink transition">
                Shelf
              </Link>
              <Link href="/profile" className="text-ink/80 hover:text-ink transition">
                Profile
              </Link>
              <Link
                href="/upload"
                className="bg-cover text-white px-4 py-2 rounded-sm hover:bg-cover-dim transition"
              >
                Upload PDF
              </Link>
              <button onClick={handleLogout} className="text-muted hover:text-ink transition flex items-center gap-1">
                <LogOut size={15} /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-ink/80 hover:text-ink transition">
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-cover text-white px-4 py-2 rounded-sm hover:bg-cover-dim transition"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
