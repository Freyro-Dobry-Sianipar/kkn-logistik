"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Package, Mail, Lock, ArrowRight } from "lucide-react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, user, loading, loginAsDemoAdmin, loginAsDemoMember } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      if (user.peran === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/member/catalog");
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      console.error("Login error details:", err);
      setError(`Gagal masuk: ${err.message}`);
      setIsLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass rounded-3xl p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-primary/20 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-emerald-500/20 blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <Package className="w-10 h-10 text-primary" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center mb-2">Selamat Datang</h1>
            <p className="text-center text-sm opacity-70 mb-8">
              Masuk untuk mengelola logistik dan perlengkapan KKN
            </p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 text-sm text-center border border-red-100 dark:border-red-900/30">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 opacity-80" htmlFor="email">
                  Alamat Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 opacity-40" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-black/10 dark:border-white/10 px-4 py-3 pl-11 bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all backdrop-blur-sm"
                    placeholder="email@contoh.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 opacity-80" htmlFor="password">
                  Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 opacity-40" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-black/10 dark:border-white/10 px-4 py-3 pl-11 bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all backdrop-blur-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 mt-4"
              >
                {isLoading ? "Memproses..." : "Masuk"}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-black/10 dark:border-white/10">
              <p className="text-center text-xs opacity-60 mb-4 font-medium uppercase tracking-wider">Pintasan Mode Demo</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { loginAsDemoAdmin(); router.push('/admin/dashboard'); }}
                  className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 py-2.5 rounded-xl text-sm font-semibold transition-all border border-blue-500/20"
                >
                  Admin Dasbor
                </button>
                <button
                  type="button"
                  onClick={() => { loginAsDemoMember(); router.push('/member/catalog'); }}
                  className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-2.5 rounded-xl text-sm font-semibold transition-all border border-emerald-500/20"
                >
                  Katalog Member
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
