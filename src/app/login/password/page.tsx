"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { BRAND_ASSETS } from "@/lib/brand/assets";
import { useAuth } from "@/lib/auth/auth-context";

export default function PasswordLoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid credentials. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isFormDisabled = isLoading || isSubmitting;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0c1929] px-4">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1929] via-[#1a3a5c] to-[#0c1929]" />
        <div className="absolute -left-1/4 top-0 h-[800px] w-[800px] rounded-full bg-[#2b59e0]/10 blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-[600px] w-[600px] rounded-full bg-[#14b89a]/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full max-w-5xl mx-auto flex-col items-center gap-8 py-24 lg:flex-row lg:gap-16 lg:py-16">
        <div className="relative flex flex-1 w-full min-h-[280px] items-center justify-center lg:min-h-0">
          <div className="infield-splash-screen__center infield-splash-screen__center--inline">
            <div className="infield-splash-screen__frame infield-splash-screen__frame--compact">
              <div className="infield-splash-screen__glow" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BRAND_ASSETS.splash}
                alt=""
                role="presentation"
                className="infield-splash-screen__logo"
              />
            </div>
            <p className="infield-splash-screen__msg" style={{ color: "rgba(148, 163, 184, 1)" }}>
              Admin · Account &amp; Project Configuration
            </p>
          </div>
        </div>

        <div className="w-full max-w-md flex-1">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-6 text-center lg:text-left">
              <h2 className="text-xl font-semibold text-white">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-400">
                Sign in with your email and password
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-300"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isFormDisabled}
                    className="h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 text-white placeholder:text-slate-500 focus:border-[#2b59e0] focus:outline-none focus:ring-1 focus:ring-[#2b59e0] disabled:opacity-50"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isFormDisabled}
                    className="h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-12 text-white placeholder:text-slate-500 focus:border-[#2b59e0] focus:outline-none focus:ring-1 focus:ring-[#2b59e0] disabled:opacity-50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isFormDisabled}
                className="h-11 w-full rounded-lg bg-[#2b59e0] font-medium text-white shadow-lg transition-all hover:bg-[#1e5fa8] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-6 w-full text-center text-xs text-slate-400 transition-colors hover:text-slate-200"
            >
              Back to passwordless sign-in
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            © 2026 V5 Global Services
          </p>
        </div>
      </div>
    </main>
  );
}
