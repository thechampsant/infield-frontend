"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api/api-client";
import { authService } from "@/lib/api/auth-service";
import { formatApiError } from "@/lib/api/get-api-error-message";

type Step =
  | { name: "request" }
  | { name: "verify" }
  | { name: "complete"; resetToken: string }
  | { name: "success" };

const titles = {
  request: "Reset your password",
  verify: "Enter your verification code",
  complete: "Choose a new password",
  success: "Password updated",
};

const inputClass = "mt-2 h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3 text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>({ name: "request" });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setError("");
    setBusy(true);
    try {
      switch (step.name) {
        case "request": {
          const value = email.trim();
          if (!value) {
            setError("Enter your registered email address.");
            return;
          }
          await authService.requestPasswordReset(value);
          setEmail(value);
          setStep({ name: "verify" });
          break;
        }
        case "verify": {
          const otp = String(fields.get("otp"));
          const { resetToken } = await authService.verifyPasswordReset(email, otp);
          if (!resetToken) throw new Error("Verification failed. Request a new code.");
          setStep({ name: "complete", resetToken });
          break;
        }
        case "complete": {
          const password = String(fields.get("password"));
          if (password !== fields.get("confirm")) {
            setError("The passwords don’t match. Enter them again.");
            return;
          }
          await authService.completePasswordReset(step.resetToken, password);
          setStep({ name: "success" });
          break;
        }
      }
    } catch (err) {
      if (step.name === "complete" && err instanceof ApiError && err.status === 401) {
        setStep({ name: "request" });
        setError("Your reset session is no longer valid. Request a new code.");
      } else {
        setError(formatApiError(err, "Please try again."));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0c1929] px-4 py-12 text-slate-300">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <h1 aria-live="polite" className="mb-5 text-xl font-semibold text-white">{titles[step.name]}</h1>
        {step.name === "success" ? (
          <p>You can now sign in with your new password.</p>
        ) : (
          <form key={step.name} onSubmit={submit}>
            <fieldset disabled={busy} className="space-y-5 text-sm">
              {step.name === "request" && (
                <label className="block">
                  Registered email address
                  <input className={inputClass} type="email" autoComplete="email" required
                    value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
              )}
              {step.name === "verify" && (
                <>
                  <p>If {email} is registered to an eligible account, we’ll send a verification code to that address.</p>
                  <label className="block">
                    Six-digit code
                    <input className={inputClass} name="otp" inputMode="numeric" pattern="[0-9]{6}"
                      maxLength={6} autoComplete="one-time-code" required />
                  </label>
                </>
              )}
              {step.name === "complete" && (
                <>
                  <label className="block">
                    New password (at least 6 characters)
                    <input className={inputClass} name="password" type="password" minLength={6} autoComplete="new-password" required />
                  </label>
                  <label className="block">
                    Confirm new password
                    <input className={inputClass} name="confirm" type="password" autoComplete="new-password" required />
                  </label>
                </>
              )}
              {error && <p role="alert" className="text-red-300">{error}</p>}
              <button className="h-11 w-full rounded-lg bg-[#2b59e0] font-medium text-white disabled:opacity-50" disabled={busy}>
                {busy ? "Please wait…" : { request: "Send code", verify: "Verify code", complete: "Save new password" }[step.name]}
              </button>
              {step.name === "verify" && (
                <button type="button" className="text-blue-300 hover:underline" onClick={() => {
                  setError("");
                  setStep({ name: "request" });
                }}>
                  Change email address or request another code
                </button>
              )}
            </fieldset>
          </form>
        )}
        <Link href="/login/password" className="mt-6 inline-block text-sm text-blue-300 hover:underline">Back to sign in</Link>
      </section>
    </main>
  );
}
