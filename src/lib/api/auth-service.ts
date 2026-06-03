/**
 * Authentication service.
 * Follows Engineering Standards: Security (no token logging).
 */

import { apiClient } from "./api-client";
import type {
  AuthSessionResponse,
  BackendUser,
  LoginDto,
  LoginResponseDto,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  VerifyOtpResponse,
} from "./types";

export interface AuthService {
  login(credentials: LoginDto): Promise<LoginResponseDto>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;

  // ── OTP ──
  requestOtp(identifier: string): Promise<{ message?: string }>;
  verifyOtp(identifier: string, otp: string): Promise<VerifyOtpResponse>;

  // ── Passkey authentication (returning user) ──
  passkeyAuthenticateBegin(
    identifier: string,
  ): Promise<PublicKeyCredentialRequestOptionsJSON>;
  passkeyAuthenticateFinish(
    identifier: string,
    assertion: Record<string, unknown>,
  ): Promise<AuthSessionResponse>;

  // ── Passkey registration (first-time / new device, after OTP) ──
  passkeyRegisterBegin(
    registrationToken: string,
  ): Promise<PublicKeyCredentialCreationOptionsJSON>;
  passkeyRegisterFinish(
    registrationToken: string,
    attestation: Record<string, unknown>,
  ): Promise<AuthSessionResponse>;

  // ── Current user ──
  getMe(): Promise<BackendUser>;
}

export const authService: AuthService = {
  async login(credentials: LoginDto): Promise<LoginResponseDto> {
    const response = await apiClient.post<LoginResponseDto>(
      "/api/v1/auth/login",
      credentials,
    );

    // Store token in client for subsequent requests
    apiClient.setAccessToken(response.accessToken);

    return response;
  },

  async logout(): Promise<void> {
    await apiClient.post("/api/v1/auth/logout");
    apiClient.clearAccessToken();
  },

  isAuthenticated(): boolean {
    return apiClient.getAccessToken() !== null;
  },

  async requestOtp(identifier: string): Promise<{ message?: string }> {
    return apiClient.post<{ message?: string }>("/api/v1/auth/otp/request", {
      identifier,
    });
  },

  async verifyOtp(
    identifier: string,
    otp: string,
  ): Promise<VerifyOtpResponse> {
    return apiClient.post<VerifyOtpResponse>("/api/v1/auth/otp/verify", {
      identifier,
      otp,
    });
  },

  async passkeyAuthenticateBegin(
    identifier: string,
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    return apiClient.post<PublicKeyCredentialRequestOptionsJSON>(
      "/api/v1/auth/passkey/authenticate/begin",
      { identifier },
    );
  },

  async passkeyAuthenticateFinish(
    identifier: string,
    assertion: Record<string, unknown>,
  ): Promise<AuthSessionResponse> {
    const response = await apiClient.post<AuthSessionResponse>(
      "/api/v1/auth/passkey/authenticate/finish",
      { identifier, ...assertion },
    );
    apiClient.setAccessToken(response.accessToken);
    return response;
  },

  async passkeyRegisterBegin(
    registrationToken: string,
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    return apiClient.post<PublicKeyCredentialCreationOptionsJSON>(
      "/api/v1/auth/passkey/register/begin",
      undefined,
      { authToken: registrationToken },
    );
  },

  async passkeyRegisterFinish(
    registrationToken: string,
    attestation: Record<string, unknown>,
  ): Promise<AuthSessionResponse> {
    const response = await apiClient.post<AuthSessionResponse>(
      "/api/v1/auth/passkey/register/finish",
      attestation,
      { authToken: registrationToken },
    );
    apiClient.setAccessToken(response.accessToken);
    return response;
  },

  async getMe(): Promise<BackendUser> {
    return apiClient.get<BackendUser>("/api/v1/users/me");
  },
};
