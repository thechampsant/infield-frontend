/**
 * Authentication service.
 * Follows Engineering Standards: Security (no token logging).
 */

import { apiClient } from "./api-client";
import type { LoginDto, LoginResponseDto } from "./types";

export interface AuthService {
  login(credentials: LoginDto): Promise<LoginResponseDto>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
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
};

