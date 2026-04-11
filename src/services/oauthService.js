import * as AuthSession from 'expo-auth-session';
import {
  CLIENT_ID,
  EPIC_ENDPOINTS,
  FHIR_BASE_URL,
  REDIRECT_URI,
  SCOPES,
} from '../constants/epicConfig';

// ---------------------------------------------------------------------------
// OAuthService
// Uses expo-auth-session for cross-platform PKCE / SMART on FHIR auth.
// ---------------------------------------------------------------------------

const discovery = {
  authorizationEndpoint: EPIC_ENDPOINTS.authorization,
  tokenEndpoint: EPIC_ENDPOINTS.token,
};

class OAuthService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.patientId = null;
    this.tokenExpiry = null;
  }

  /**
   * Performs the full OAuth 2.0 + PKCE authorization code flow.
   * Returns { accessToken, patientId, expiresIn }.
   */
  async authenticate() {
    console.log('[HealthView] authenticate() called');

    // Build PKCE request manually so we can call it outside a React component.
    const request = new AuthSession.AuthRequest({
      clientId: CLIENT_ID,
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
      usePKCE: true,
      extraParams: {
        aud: FHIR_BASE_URL,
      },
    });

    console.log('[HealthView] AuthRequest built, generating auth URL…');

    // Show the full authorization URL on both Android and web.
    const authUrl = await request.makeAuthUrlAsync(discovery);
    console.log('[HealthView] Authorization URL:', authUrl.toString());
    // Prompt user with browser-based login.
    const result = await request.promptAsync(discovery);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error('Login was cancelled.');
    }

    if (result.type === 'error') {
      const desc = result.error?.description ?? result.error?.code ?? 'unknown';
      throw new Error(`OAuth error: ${desc}`);
    }

    if (result.type !== 'success') {
      throw new Error('Authentication failed. Please try again.');
    }

    // Exchange the authorization code for tokens manually so we get the
    // raw JSON response — expo-auth-session drops Epic's custom "patient" field.
    const tokenResponse = await fetch(EPIC_ENDPOINTS.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code: result.params.code,
        redirect_uri: REDIRECT_URI,
        code_verifier: request.codeVerifier,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    console.log('[HealthView] Raw token response:', JSON.stringify(tokenData));

    if (tokenData.error) {
      throw new Error(`Token error: ${tokenData.error_description ?? tokenData.error}`);
    }

    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token ?? null;
    this.patientId = tokenData.patient ?? null;
    this.tokenExpiry = tokenData.expires_in
      ? Date.now() + tokenData.expires_in * 1000
      : null;

    console.log('[HealthView] Patient ID:', this.patientId);

    return {
      accessToken: this.accessToken,
      patientId: this.patientId,
      expiresIn: tokenData.expires_in,
    };
  }

  isTokenExpired() {
    if (!this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry - 5 * 60 * 1000;
  }

  async refreshAccessToken() {
    if (!this.refreshToken) throw new Error('No refresh token available.');

    const tokenResult = await AuthSession.refreshAsync(
      { clientId: CLIENT_ID, refreshToken: this.refreshToken },
      discovery
    );

    this.accessToken = tokenResult.accessToken;
    if (tokenResult.refreshToken) this.refreshToken = tokenResult.refreshToken;
    this.tokenExpiry = tokenResult.expiresIn
      ? Date.now() + tokenResult.expiresIn * 1000
      : null;

    return { accessToken: this.accessToken, expiresIn: tokenResult.expiresIn };
  }

  async getValidAccessToken() {
    if (this.isTokenExpired() && this.refreshToken) {
      await this.refreshAccessToken();
    }
    return this.accessToken;
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.patientId = null;
    this.tokenExpiry = null;
  }

  isAuthenticated() {
    return !!this.accessToken && !this.isTokenExpired();
  }

  getPatientId() {
    return this.patientId;
  }
}

export const oauthService = new OAuthService();
export default oauthService;
