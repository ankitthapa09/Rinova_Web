import { env } from '@/config/env';
import { AppError } from '@/utils/AppError';
import { logger } from '@/config/logger';

// Google sign-in with the authorization code flow, exchanged server-side. The
// client secret stays on the server; the browser only ever holds the one-time code.

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export interface GoogleProfile {
  /** Google's stable id for this user */
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

export const oauthService = {
  /** Google sign-in only works when both credentials are configured. */
  isConfigured(): boolean {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  },

  // Consent screen url. state is also kept in a cookie and must come back
  // unchanged, which is what stops csrf on the callback.
  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID as string,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
      access_type: 'online',
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  },

  /** Trades the one-time code for the user's verified Google profile. */
  async fetchProfile(code: string): Promise<GoogleProfile> {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID as string,
        client_secret: env.GOOGLE_CLIENT_SECRET as string,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      // log google's error body so the real cause (bad secret, used code) shows up
      const body = await tokenRes.text().catch(() => '');
      logger.warn('google token exchange failed', { status: tokenRes.status, body: body.slice(0, 500) });
      throw AppError.unauthorized('Google sign-in failed');
    }

    const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string };
    if (!accessToken) throw AppError.unauthorized('Google sign-in failed');

    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      const body = await profileRes.text().catch(() => '');
      logger.warn('google userinfo request failed', { status: profileRes.status, body: body.slice(0, 500) });
      throw AppError.unauthorized('Google sign-in failed');
    }

    const p = (await profileRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    if (!p.sub || !p.email) throw AppError.unauthorized('Google sign-in failed');

    return {
      googleId: p.sub,
      email: p.email.toLowerCase(),
      emailVerified: p.email_verified === true,
      name: p.name?.trim() || p.email.split('@')[0],
      picture: p.picture,
    };
  },
};
