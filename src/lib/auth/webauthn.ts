/**
 * WebAuthn / passkey helpers for the web login flow (INF2-1940).
 *
 * The backend returns PublicKeyCredential(Creation|Request)Options as JSON with
 * base64url-encoded ArrayBuffers (the standard `*JSON` shape). We decode those
 * into real ArrayBuffers for `navigator.credentials`, then re-encode the
 * resulting credential to send back to the `finish` endpoints.
 */

// ─────────────────────────────────────────────────────────────
// Capability detection
// ─────────────────────────────────────────────────────────────

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.credentials
  );
}

/** Whether a built-in platform authenticator (Touch ID / Windows Hello) is usable. */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// base64url <-> ArrayBuffer
// ─────────────────────────────────────────────────────────────

export function base64UrlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    padded.length % 4 === 0 ? padded : padded + "=".repeat(4 - (padded.length % 4));
  const binary = atob(pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ─────────────────────────────────────────────────────────────
// Option decoders (server JSON -> navigator options)
// ─────────────────────────────────────────────────────────────

type DescriptorJSON = { id: string; type: string; transports?: string[] };

function decodeDescriptors(
  list: DescriptorJSON[] | undefined,
): PublicKeyCredentialDescriptor[] | undefined {
  if (!Array.isArray(list)) return undefined;
  return list.map((d) => ({
    id: base64UrlToBuffer(d.id),
    type: d.type as PublicKeyCredentialType,
    transports: d.transports as AuthenticatorTransport[] | undefined,
  }));
}

/**
 * The backend may wrap options in `{ publicKey: {...} }` or return them flat.
 * Normalize to the inner publicKey object.
 */
function inner(options: Record<string, unknown>): Record<string, unknown> {
  if (options && typeof options.publicKey === "object" && options.publicKey) {
    return options.publicKey as Record<string, unknown>;
  }
  return options;
}

export function toCreationOptions(
  serverOptions: Record<string, unknown>,
): PublicKeyCredentialCreationOptions {
  const o = inner(serverOptions);
  const user = o.user as { id: string; name: string; displayName: string };
  return {
    ...(o as object),
    challenge: base64UrlToBuffer(o.challenge as string),
    user: {
      ...user,
      id: base64UrlToBuffer(user.id),
    },
    excludeCredentials: decodeDescriptors(
      o.excludeCredentials as DescriptorJSON[] | undefined,
    ),
  } as PublicKeyCredentialCreationOptions;
}

export function toRequestOptions(
  serverOptions: Record<string, unknown>,
): PublicKeyCredentialRequestOptions {
  const o = inner(serverOptions);
  return {
    ...(o as object),
    challenge: base64UrlToBuffer(o.challenge as string),
    allowCredentials: decodeDescriptors(
      o.allowCredentials as DescriptorJSON[] | undefined,
    ),
  } as PublicKeyCredentialRequestOptions;
}

// ─────────────────────────────────────────────────────────────
// Credential serializers (navigator result -> server JSON)
// ─────────────────────────────────────────────────────────────

export function serializeAttestation(
  credential: PublicKeyCredential,
): Record<string, unknown> {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      attestationObject: bufferToBase64Url(response.attestationObject),
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

export function serializeAssertion(
  credential: PublicKeyCredential,
): Record<string, unknown> {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle
        ? bufferToBase64Url(response.userHandle)
        : null,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

// ─────────────────────────────────────────────────────────────
// High-level ceremonies
// ─────────────────────────────────────────────────────────────

function assertCeremonyPrerequisites(): void {
  if (!isWebAuthnSupported()) {
    throw new Error("This browser does not support passkeys (WebAuthn).");
  }
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    throw new Error(
      "Passkeys require a secure context (HTTPS or localhost). Open the app over HTTPS or http://localhost.",
    );
  }
}

/** Run navigator.credentials.create with decoded server options. */
export async function createPasskey(
  serverOptions: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  assertCeremonyPrerequisites();
  const credential = (await navigator.credentials.create({
    publicKey: toCreationOptions(serverOptions),
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("Passkey creation was cancelled.");
  return serializeAttestation(credential);
}

/** Run navigator.credentials.get with decoded server options. */
export async function getPasskeyAssertion(
  serverOptions: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  assertCeremonyPrerequisites();
  const credential = (await navigator.credentials.get({
    publicKey: toRequestOptions(serverOptions),
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("Passkey sign-in was cancelled.");
  return serializeAssertion(credential);
}

/**
 * Turn a WebAuthn / API failure into a user-readable explanation. The native
 * DOMException names are the main signal for *why* a prompt never appeared.
 */
export function describePasskeyError(err: unknown): string {
  if (err instanceof Error) {
    switch (err.name) {
      case "NotAllowedError":
        return "The passkey prompt was dismissed or timed out. Please try again.";
      case "SecurityError":
        return "This site's domain isn't allowed for passkeys. When testing on localhost or a staging URL, the server's passkey domain (rpId) must match the page's domain.";
      case "InvalidStateError":
        return "A passkey is already registered on this device for this account.";
      case "NotSupportedError":
        return "This device or browser can't create a passkey here. Use OTP, or a device with a screen lock / built-in authenticator.";
      case "AbortError":
        return "The passkey request was cancelled.";
      case "ConstraintError":
        return "Your device couldn't satisfy the passkey requirements (e.g. no screen lock enabled).";
      default:
        return err.message || "Passkey operation failed.";
    }
  }
  return "Passkey operation failed.";
}

/** Friendly device label for display (e.g. "Windows · Chrome"). */
export function detectDeviceLabel(): string {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  const os = /Mac/.test(ua)
    ? "macOS"
    : /Windows/.test(ua)
      ? "Windows"
      : /Android/.test(ua)
        ? "Android"
        : /Linux/.test(ua)
          ? "Linux"
          : /iPhone|iPad/.test(ua)
            ? "iOS"
            : "This device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  return `${os} · ${browser}`;
}
