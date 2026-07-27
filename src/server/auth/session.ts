import { cookies } from "next/headers";
import { db } from "@/db/client";
import { schema } from "@/db/client";
import { eq, and, isNull, gt } from "drizzle-orm";
import { PRODUCT } from "@/lib/product-config";
import crypto from "crypto";

/**
 * Session management — device profiles with secure, hashed, rolling sessions.
 * The raw session token is NEVER stored; only its SHA-256 hash.
 * The client never receives the token in JS — it's HttpOnly cookie only.
 */

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: PRODUCT.prodCookieName.startsWith("__Host-"),
  sameSite: "lax" as const,
  path: "/",
  maxAge: PRODUCT.sessionMaxAgeSeconds,
};

function getCookieName(): string {
  // In production with HTTPS, use __Host- prefixed cookie.
  // In dev without HTTPS, use unprefixed cookie.
  if (process.env.NODE_ENV === "production") {
    return PRODUCT.prodCookieName;
  }
  return PRODUCT.devCookieName;
}

/**
 * Generate a cryptographically secure session token (256 bits, URL-safe).
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url"); // 43 chars, URL-safe
}

/**
 * Hash a token for storage. SHA-256 with a pepper from SESSION_SECRET.
 */
function hashToken(token: string): string {
  const pepper = process.env.SESSION_SECRET!;
  return crypto
    .createHmac("sha256", pepper)
    .update(token)
    .digest("hex");
}

/**
 * Create a new device profile + session.
 * Returns the raw token (to set in cookie) — caller must NOT log or return it to client JS.
 */
export async function createDeviceProfile(displayName: string, colourKey: string): Promise<{
  userId: string;
  token: string;
}> {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(schema.users)
      .values({
        displayName: displayName.trim().slice(0, 50),
        colourKey,
      })
      .returning({ id: schema.users.id });

    const token = generateToken();
    const tokenHash = hashToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PRODUCT.sessionMaxAgeSeconds * 1000);

    await tx.insert(schema.userSessions).values({
      userId: user.id,
      tokenHash,
      expiresAt,
      lastSeenAt: now,
    });

    return { userId: user.id, token };
  });
}

/**
 * Set the session cookie on the response.
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(getCookieName(), token, COOKIE_OPTIONS);
}

/**
 * Get the current session from the cookie.
 * Returns null if no session, expired, or revoked.
 * Refreshes lastSeenAt (max once per day to avoid unnecessary writes).
 */
export async function getSession(): Promise<{ userId: string; sessionId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const now = new Date();

  const sessions = await db
    .select()
    .from(schema.userSessions)
    .where(
      and(
        eq(schema.userSessions.tokenHash, tokenHash),
        isNull(schema.userSessions.revokedAt),
        gt(schema.userSessions.expiresAt, now)
      )
    )
    .limit(1);

  if (sessions.length === 0) return null;
  const session = sessions[0];

  // Refresh lastSeenAt — max once per day
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (session.lastSeenAt < dayAgo) {
    await db
      .update(schema.userSessions)
      .set({ lastSeenAt: now })
      .where(eq(schema.userSessions.id, session.id));
  }

  return { userId: session.userId, sessionId: session.id };
}

/**
 * Require a session — redirect to onboarding if not authenticated.
 * Use in Server Components for authenticated pages.
 */
export async function requireSession(): Promise<{ userId: string; sessionId: string }> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

/**
 * Sign out — revoke the session and delete the cookie.
 */
export async function signOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await db
      .update(schema.userSessions)
      .set({ revokedAt: new Date() })
      .where(eq(schema.userSessions.tokenHash, tokenHash));
  }
  cookieStore.delete(getCookieName());
}

/**
 * Update the device profile.
 */
export async function updateDeviceProfile(userId: string, updates: { displayName?: string; colourKey?: string }) {
  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.displayName !== undefined) {
    setValues.displayName = updates.displayName.trim().slice(0, 50);
  }
  if (updates.colourKey !== undefined) {
    setValues.colourKey = updates.colourKey;
  }
  await db.update(schema.users).set(setValues).where(eq(schema.users.id, userId));
}

/**
 * Get the current user's profile.
 */
export async function getCurrentUser(userId: string) {
  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return users[0] ?? null;
}
