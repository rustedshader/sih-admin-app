import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.surakshit.world";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  email: string;
  country_code: string;
  phone_number: string;
  is_kyc_verified: boolean;
  is_email_verified: boolean;
  is_active: boolean;
  role: "admin" | "tourist" | "guide" | "super_admin";
  blockchain_address?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
}

class AuthService {
  private static instance: AuthService;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Initialize tokens from storage
  async initializeTokens(): Promise<void> {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      const refreshToken = await AsyncStorage.getItem("refresh_token");

      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
    } catch (error) {
      console.error("Failed to initialize tokens:", error);
    }
  }

  // Login
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    try {
      const formData = new URLSearchParams();
      formData.append("username", credentials.username);
      formData.append("password", credentials.password);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Login failed: ${response.status}`);
      }

      const tokenData: TokenResponse = await response.json();

      // Store tokens
      await this.storeTokens(tokenData);

      return tokenData;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  // Get current user info
  async getCurrentUser(): Promise<User> {
    if (!this.accessToken) {
      throw new Error("No access token available");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token might be expired, try to refresh
          await this.refreshAccessToken();
          return this.getCurrentUser(); // Retry with new token
        }
        throw new Error(`Failed to get user info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Get current user error:", error);
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken(): Promise<AccessTokenResponse> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!response.ok) {
        // If refresh fails, clear all tokens
        await this.clearTokens();
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const tokenData: AccessTokenResponse = await response.json();

      // Update stored access token
      this.accessToken = tokenData.access_token;
      await AsyncStorage.setItem("access_token", tokenData.access_token);

      return tokenData;
    } catch (error) {
      console.error("Token refresh error:", error);
      throw error;
    }
  }

  // Logout
  async logout(): Promise<void> {
    if (!this.refreshToken) {
      // Already logged out
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
    } catch (error) {
      console.error("Logout API error:", error);
      // Continue with local logout even if API fails
    } finally {
      // Always clear tokens locally
      await this.clearTokens();
    }
  }

  // Store tokens in AsyncStorage
  private async storeTokens(tokenData: TokenResponse): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        ["access_token", tokenData.access_token],
        ["refresh_token", tokenData.refresh_token],
      ]);

      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token;
    } catch (error) {
      console.error("Failed to store tokens:", error);
      throw error;
    }
  }

  // Clear tokens
  private async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(["access_token", "refresh_token"]);
      this.accessToken = null;
      this.refreshToken = null;
    } catch (error) {
      console.error("Failed to clear tokens:", error);
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Get access token for API calls
  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Create authenticated fetch wrapper
  async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.accessToken) {
      throw new Error("No access token available");
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // If unauthorized, try to refresh token and retry
      if (response.status === 401 && this.refreshToken) {
        try {
          await this.refreshAccessToken();
          // Retry with new token
          const retryHeaders = {
            ...options.headers,
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          };

          return fetch(url, {
            ...options,
            headers: retryHeaders,
          });
        } catch (refreshError) {
          // If refresh fails, clear tokens and throw
          await this.clearTokens();
          throw new Error("Authentication failed");
        }
      }

      return response;
    } catch (error) {
      console.error("Authenticated fetch error:", error);
      throw error;
    }
  }
}

export default AuthService;
