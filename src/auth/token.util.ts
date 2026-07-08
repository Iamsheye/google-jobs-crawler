import { createHash, randomUUID } from 'crypto';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Single source of truth for the refresh-token lifetime. Used both for the
 * JWT `exp` (via seconds) and the DB `expiresAt` so the two can never drift
 * apart.
 */
export const REFRESH_TOKEN_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * Deterministic hash used to store lookup tokens (verification, reset,
 * refresh) at rest. The raw token is only ever handed to the client or sent
 * via email; the DB persists only this SHA-256 digest so a leaked database
 * cannot be used to redeem tokens.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newVerificationToken(): {
  rawToken: string;
  hashedToken: string;
  expiresAt: Date;
} {
  const rawToken = randomUUID();
  return {
    rawToken,
    hashedToken: hashToken(rawToken),
    expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
  };
}

export function newResetToken(): {
  rawToken: string;
  hashedToken: string;
  expiresAt: Date;
} {
  const rawToken = randomUUID();
  return {
    rawToken,
    hashedToken: hashToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  };
}
