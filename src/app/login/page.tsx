"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authService, formatApiError } from "@/lib/api";
import { ApiError } from "@/lib/api/api-client";
import type { BackendUser } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { landingRouteForRole } from "@/lib/auth/role-routing";
import {
  createPasskey,
  describePasskeyError,
  detectDeviceLabel,
  getPasskeyAssertion,
  isWebAuthnSupported,
} from "@/lib/auth/webauthn";
import { HeroPanel } from "@/components/auth/login/hero-panel";
import { AuthToast, type ToastState } from "@/components/auth/login/auth-toast";
import { IdentifyStep } from "@/components/auth/login/identify-step";
import { PasskeyLoginStep } from "@/components/auth/login/passkey-login-step";
import { NewDeviceStep } from "@/components/auth/login/new-device-step";
import { OtpStep } from "@/components/auth/login/otp-step";
import { PasskeyCreateStep } from "@/components/auth/login/passkey-create-step";
import { NotSupportedStep } from "@/components/auth/login/not-supported-step";

type Step =
  | "identify"
  | "passkeyLogin"
  | "newDevice"
  | "otp"
  | "passkeyCreate"
  | "notSupported";

type OtpVariant = "first-time" | "otp-fallback" | "new-device";

const HERO: Record<Step, Parameters<typeof HeroPanel>[0]> = {
  identify: {
    eyebrow: "Field Force Management",
    title: "Run the field.",
    titleEm: "From anywhere.",
    subtitle:
      "Attendance, visits, audits and sales — one platform trusted by 40,000+ field executives across India.",
    showStats: true,
  },
  passkeyLogin: {
    eyebrow: "Field Force Management",
    title: "Welcome",
    titleEm: "back.",
    subtitle: "One tap. Your dashboard is ready.",
  },
  newDevice: {
    eyebrow: "New Device",
    title: "New device,",
    titleEm: "quick setup.",
    subtitle:
      "Verify once via OTP, then set up a passkey for instant future access from this device.",
  },
  otp: {
    eyebrow: "Secure Verification",
    title: "Quick.",
    titleEm: "Secure. In.",
    subtitle: "OTP sent to your registered contact. Check it to continue.",
  },
  passkeyCreate: {
    eyebrow: "One-time Setup",
    title: "No passwords.",
    titleEm: "Ever again.",
    subtitle:
      "Passkeys use your device's biometrics or PIN. Faster and far more secure than any password.",
  },
  notSupported: {
    eyebrow: "Compatibility",
    title: "Use a supported",
    titleEm: "browser.",
    subtitle:
      "This web sign-in flow finishes with passkey registration. If passkeys aren't available here, use a supported browser or sign in with your password.",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { establishSession } = useAuth();

  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [requestOptions, setRequestOptions] = useState<Record<
    string,
    unknown
  > | null>(null);

  const [identifyLoading, setIdentifyLoading] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);

  const [pkLoginSub, setPkLoginSub] = useState<"idle" | "scanning" | "failed">(
    "idle",
  );
  const [pkLoginError, setPkLoginError] = useState<string | null>(null);
  const [pkCreateSub, setPkCreateSub] = useState<
    "prompt" | "scanning" | "failed" | "success"
  >("prompt");
  const [pkCreateError, setPkCreateError] = useState<string | null>(null);

  const [otpVariant, setOtpVariant] = useState<OtpVariant>("first-time");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [otpResetSignal, setOtpResetSignal] = useState(0);
  const [newDeviceLoading, setNewDeviceLoading] = useState(false);

  const [toast, setToast] = useState<ToastState>(null);

  const deviceLabel = useMemo(() => detectDeviceLabel(), []);

  const showToast = useCallback((message: string, type?: "ok" | "er") => {
    setToast({ message, type });
  }, []);

  const completeSession = useCallback(
    (accessToken: string, user: BackendUser) => {
      establishSession(accessToken, user);
      router.replace(landingRouteForRole(user.role));
    },
    [establishSession, router],
  );

  // ── Identify ──
  const handleIdentify = useCallback(
    async (value: string) => {
      setIdentifier(value);
      setIdentifyError(null);

      if (!isWebAuthnSupported()) {
        setStep("notSupported");
        return;
      }

      setIdentifyLoading(true);
      try {
        const options = await authService.passkeyAuthenticateBegin(value);
        setRequestOptions(options);
        setPkLoginSub("idle");
        setStep("passkeyLogin");
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          // 404 covers both "user not found" and "no passkey registered".
          if (/passkey/i.test(err.message)) {
            setStep("newDevice");
          } else {
            setIdentifyError(
              formatApiError(err, "We couldn't find that account."),
            );
          }
        } else {
          setIdentifyError(formatApiError(err, "Something went wrong."));
        }
      } finally {
        setIdentifyLoading(false);
      }
    },
    [],
  );

  // ── Passkey sign-in (returning user) ──
  const handlePasskeySignIn = useCallback(async () => {
    if (!requestOptions) return;
    setPkLoginSub("scanning");
    setPkLoginError(null);
    try {
      const assertion = await getPasskeyAssertion(requestOptions);
      const res = await authService.passkeyAuthenticateFinish(
        identifier,
        assertion,
      );
      showToast("Signed in!", "ok");
      completeSession(res.accessToken, res.user);
    } catch (err) {
      console.error("Passkey sign-in failed", err);
      const message =
        err instanceof ApiError
          ? formatApiError(err, "Verification failed")
          : describePasskeyError(err);
      setPkLoginError(message);
      setPkLoginSub("failed");
      showToast("Passkey sign-in failed", "er");
    }
  }, [requestOptions, identifier, showToast, completeSession]);

  // ── OTP ──
  const sendOtp = useCallback(async () => {
    setOtpLoading(true);
    setOtpError(null);
    try {
      await authService.requestOtp(identifier);
      setOtpResetSignal((n) => n + 1);
      showToast("OTP sent", "ok");
    } catch (err) {
      setOtpError(formatApiError(err, "Couldn't send OTP."));
    } finally {
      setOtpLoading(false);
    }
  }, [identifier, showToast]);

  const startOtpFlow = useCallback(
    (variant: OtpVariant) => {
      setOtpVariant(variant);
      setOtpError(null);
      setOtpSuccess(false);
      setStep("otp");
      void sendOtp();
    },
    [sendOtp],
  );

  const handleVerifyOtp = useCallback(
    async (otp: string) => {
      setOtpLoading(true);
      setOtpError(null);
      try {
        const res = await authService.verifyOtp(identifier, otp);
        setRegistrationToken(res.registrationToken);
        setOtpSuccess(true);
        showToast("OTP verified!", "ok");
        setTimeout(() => {
          setOtpSuccess(false);
          setPkCreateSub("prompt");
          setStep("passkeyCreate");
        }, 1000);
      } catch (err) {
        setOtpError(formatApiError(err, "Incorrect OTP. Please try again."));
        showToast("Wrong OTP", "er");
      } finally {
        setOtpLoading(false);
      }
    },
    [identifier, showToast],
  );

  // ── Passkey creation (first-time / new device) ──
  const handleCreatePasskey = useCallback(async () => {
    if (!registrationToken) return;
    setPkCreateSub("scanning");
    setPkCreateError(null);
    try {
      const options =
        await authService.passkeyRegisterBegin(registrationToken);
      const attestation = await createPasskey(options);
      const res = await authService.passkeyRegisterFinish(
        registrationToken,
        attestation,
      );
      setPkCreateSub("success");
      showToast("Passkey created!", "ok");
      setTimeout(() => completeSession(res.accessToken, res.user), 1200);
    } catch (err) {
      console.error("Passkey registration failed", err);
      const message =
        err instanceof ApiError
          ? formatApiError(err, "Couldn't set up passkey")
          : describePasskeyError(err);
      setPkCreateError(message);
      setPkCreateSub("failed");
      showToast("Passkey setup failed", "er");
    }
  }, [registrationToken, showToast, completeSession]);

  const resetToIdentify = useCallback(() => {
    setStep("identify");
    setIdentifyError(null);
    setPkLoginSub("idle");
  }, []);

  const goToPasswordLogin = useCallback(() => {
    router.push("/login/password");
  }, [router]);

  let content: ReactNode = null;
  switch (step) {
    case "identify":
      content = (
        <>
          <IdentifyStep
            initialValue={identifier}
            loading={identifyLoading}
            error={identifyError}
            onSubmit={handleIdentify}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.push("/login/password")}
          >
            Sign in with password instead
          </button>
        </>
      );
      break;
    case "passkeyLogin":
      content = (
        <PasskeyLoginStep
          identifier={identifier}
          deviceLabel={deviceLabel}
          subState={pkLoginSub}
          errorMessage={pkLoginError}
          onSignIn={handlePasskeySignIn}
          onUseOtp={() => startOtpFlow("otp-fallback")}
          onUseDifferentAccount={resetToIdentify}
        />
      );
      break;
    case "newDevice":
      content = (
        <NewDeviceStep
          deviceLabel={deviceLabel}
          loading={newDeviceLoading}
          onVerifyAndRegister={() => {
            setNewDeviceLoading(true);
            startOtpFlow("new-device");
            setNewDeviceLoading(false);
          }}
          onCancel={resetToIdentify}
        />
      );
      break;
    case "otp":
      content = (
        <OtpStep
          key={otpResetSignal}
          identifierLabel={identifier}
          variant={otpVariant}
          loading={otpLoading}
          error={otpError}
          success={otpSuccess}
          successText="OTP verified. Setting up your passkey…"
          onVerify={handleVerifyOtp}
          onResend={sendOtp}
          onBack={resetToIdentify}
        />
      );
      break;
    case "passkeyCreate":
      content = (
        <PasskeyCreateStep
          deviceLabel={deviceLabel}
          subState={pkCreateSub}
          errorMessage={pkCreateError}
          onCreate={handleCreatePasskey}
          onRetry={handleCreatePasskey}
          onUsePassword={goToPasswordLogin}
        />
      );
      break;
    case "notSupported":
      content = (
        <NotSupportedStep
          onUsePassword={goToPasswordLogin}
          onBack={resetToIdentify}
        />
      );
      break;
  }

  const hero = HERO[step];

  return (
    <div className="if2-auth">
      <div className="shell">
        <HeroPanel {...hero} />
        <main className="auth">
          <div className="auth-inner" key={step}>
            {content}
          </div>
        </main>
      </div>
      <AuthToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
