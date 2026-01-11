"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";

// Singularity animation component
function SingularityAnimation() {
  const [particles, setParticles] = useState<Array<{
    id: number;
    angle: number;
    distance: number;
    speed: number;
    size: number;
    opacity: number;
  }>>([]);

  useEffect(() => {
    // Generate particles
    const newParticles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      angle: Math.random() * 360,
      distance: 80 + Math.random() * 120,
      speed: 0.5 + Math.random() * 1.5,
      size: 1 + Math.random() * 3,
      opacity: 0.3 + Math.random() * 0.7,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="singularity-container">
      {/* Outer glow rings */}
      <div className="singularity-ring ring-1" />
      <div className="singularity-ring ring-2" />
      <div className="singularity-ring ring-3" />
      
      {/* Event horizon */}
      <div className="event-horizon" />
      
      {/* The singularity core */}
      <div className="singularity-core">
        <div className="core-inner" />
      </div>
      
      {/* Accretion disk */}
      <div className="accretion-disk" />
      
      {/* Orbiting particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="particle"
          style={{
            '--angle': `${particle.angle}deg`,
            '--distance': `${particle.distance}px`,
            '--speed': `${particle.speed}s`,
            '--size': `${particle.size}px`,
            '--opacity': particle.opacity,
            '--delay': `${particle.id * 0.1}s`,
          } as React.CSSProperties}
        />
      ))}
      
      {/* Light rays being pulled in */}
      <div className="light-rays">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="light-ray"
            style={{ '--ray-angle': `${i * 45}deg` } as React.CSSProperties}
          />
        ))}
      </div>

      <style jsx>{`
        .singularity-container {
          position: relative;
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Outer glow rings */
        .singularity-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid;
          animation: pulse 4s ease-in-out infinite;
        }

        .ring-1 {
          width: 180px;
          height: 180px;
          border-color: rgba(99, 102, 241, 0.1);
          animation-delay: 0s;
        }

        .ring-2 {
          width: 140px;
          height: 140px;
          border-color: rgba(139, 92, 246, 0.15);
          animation-delay: 0.5s;
        }

        .ring-3 {
          width: 100px;
          height: 100px;
          border-color: rgba(168, 85, 247, 0.2);
          animation-delay: 1s;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }

        /* Event horizon - the point of no return */
        .event-horizon {
          position: absolute;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            transparent 30%,
            rgba(99, 102, 241, 0.1) 50%,
            rgba(139, 92, 246, 0.2) 70%,
            rgba(168, 85, 247, 0.1) 100%
          );
          animation: rotate 20s linear infinite;
        }

        /* The singularity core */
        .singularity-core {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: radial-gradient(
            circle at 30% 30%,
            #1e1b4b 0%,
            #0c0a1d 50%,
            #000 100%
          );
          box-shadow:
            0 0 30px rgba(99, 102, 241, 0.5),
            0 0 60px rgba(139, 92, 246, 0.3),
            0 0 100px rgba(168, 85, 247, 0.2),
            inset 0 0 20px rgba(0, 0, 0, 0.8);
          animation: breathe 3s ease-in-out infinite;
        }

        .core-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 8px;
          height: 8px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(168, 85, 247, 0.5) 50%,
            transparent 100%
          );
          animation: flicker 2s ease-in-out infinite;
        }

        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            box-shadow:
              0 0 30px rgba(99, 102, 241, 0.5),
              0 0 60px rgba(139, 92, 246, 0.3),
              0 0 100px rgba(168, 85, 247, 0.2),
              inset 0 0 20px rgba(0, 0, 0, 0.8);
          }
          50% {
            transform: scale(1.05);
            box-shadow:
              0 0 40px rgba(99, 102, 241, 0.6),
              0 0 80px rgba(139, 92, 246, 0.4),
              0 0 120px rgba(168, 85, 247, 0.3),
              inset 0 0 20px rgba(0, 0, 0, 0.8);
          }
        }

        @keyframes flicker {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }

        /* Accretion disk */
        .accretion-disk {
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(99, 102, 241, 0.3) 60deg,
            rgba(139, 92, 246, 0.4) 120deg,
            rgba(168, 85, 247, 0.3) 180deg,
            rgba(236, 72, 153, 0.2) 240deg,
            rgba(99, 102, 241, 0.3) 300deg,
            transparent 360deg
          );
          animation: rotate 8s linear infinite;
          mask-image: radial-gradient(
            circle,
            transparent 25%,
            black 26%,
            black 45%,
            transparent 46%
          );
          -webkit-mask-image: radial-gradient(
            circle,
            transparent 25%,
            black 26%,
            black 45%,
            transparent 46%
          );
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Particles being pulled into singularity */
        .particle {
          position: absolute;
          width: var(--size);
          height: var(--size);
          background: white;
          border-radius: 50%;
          opacity: var(--opacity);
          animation: spiral calc(var(--speed) * 3) linear infinite;
          animation-delay: var(--delay);
          box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
        }

        @keyframes spiral {
          0% {
            transform: rotate(var(--angle)) translateX(var(--distance)) scale(1);
            opacity: var(--opacity);
          }
          80% {
            opacity: var(--opacity);
          }
          100% {
            transform: rotate(calc(var(--angle) + 720deg)) translateX(0) scale(0);
            opacity: 0;
          }
        }

        /* Light rays being bent toward singularity */
        .light-rays {
          position: absolute;
          width: 200px;
          height: 200px;
        }

        .light-ray {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(139, 92, 246, 0.3) 50%,
            transparent 100%
          );
          transform-origin: left center;
          transform: rotate(var(--ray-angle));
          animation: rayPull 3s ease-in-out infinite;
          animation-delay: calc(var(--ray-angle) / 90deg * 0.2s);
        }

        @keyframes rayPull {
          0%, 100% {
            opacity: 0.3;
            transform: rotate(var(--ray-angle)) scaleX(1);
          }
          50% {
            opacity: 0.6;
            transform: rotate(var(--ray-angle)) scaleX(0.7);
          }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
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
      router.push("/super-admin");
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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a0a12] px-4">
      {/* Cosmic background */}
      <div className="pointer-events-none fixed inset-0">
        {/* Deep space gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a12] via-[#0f0f1a] to-[#0a0a12]" />
        
        {/* Nebula effects */}
        <div className="absolute -left-1/4 top-0 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-transparent blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-violet-900/20 via-fuchsia-900/10 to-transparent blur-3xl" />
        
        {/* Star field */}
        <div className="stars" />
      </div>

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-8 lg:flex-row lg:gap-16">
        {/* Left side - Singularity Animation */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <SingularityAnimation />
          
          <div className="mt-8 text-center">
            <h1 className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              Singularity
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              Where all data converges
            </p>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="w-full max-w-md flex-1">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-6 text-center lg:text-left">
              <h2 className="text-xl font-semibold text-white">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-400">
                Sign in to access the admin console
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-300"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    placeholder="superadmin@whynest.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isFormDisabled}
                    required
                    autoComplete="email"
                    className="h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-all focus:border-purple-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isFormDisabled}
                    required
                    autoComplete="current-password"
                    className="h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-10 text-sm text-white placeholder-slate-500 transition-all focus:border-purple-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isFormDisabled}
                className="relative h-11 w-full overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 font-medium text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-purple-500/40 hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
                
                {/* Button shine effect */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </button>
            </form>

            {/* Demo Credentials Hint */}
            <div className="mt-6 rounded-lg border border-white/5 bg-white/5 px-4 py-3">
              <p className="text-xs font-medium text-slate-400">
                Demo Credentials
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500">
                superadmin@whynest.com / SuperAdmin@123
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-slate-600">
            Singularity v1.0 • Admin Console
          </p>
        </div>
      </div>

      {/* Global styles for stars */}
      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .stars {
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(1px 1px at 20px 30px, white, transparent),
            radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.6), transparent),
            radial-gradient(1px 1px at 90px 40px, white, transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 160px 120px, white, transparent),
            radial-gradient(2px 2px at 200px 50px, rgba(139, 92, 246, 0.8), transparent),
            radial-gradient(1px 1px at 220px 90px, rgba(255,255,255,0.6), transparent),
            radial-gradient(1px 1px at 250px 150px, white, transparent),
            radial-gradient(1px 1px at 280px 30px, rgba(255,255,255,0.8), transparent),
            radial-gradient(2px 2px at 320px 100px, rgba(99, 102, 241, 0.7), transparent),
            radial-gradient(1px 1px at 350px 60px, white, transparent),
            radial-gradient(1px 1px at 380px 140px, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 420px 80px, white, transparent),
            radial-gradient(1px 1px at 450px 120px, rgba(255,255,255,0.6), transparent),
            radial-gradient(2px 2px at 500px 40px, rgba(168, 85, 247, 0.6), transparent),
            radial-gradient(1px 1px at 530px 110px, white, transparent),
            radial-gradient(1px 1px at 580px 70px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 620px 130px, white, transparent),
            radial-gradient(1px 1px at 660px 50px, rgba(255,255,255,0.7), transparent);
          background-size: 700px 200px;
          animation: twinkle 5s ease-in-out infinite alternate;
        }

        @keyframes twinkle {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </main>
  );
}
