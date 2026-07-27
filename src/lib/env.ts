/**
 * Environment validation — ensures all required variables are present.
 * Called at startup; missing variables produce a clear error.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validate() {
  // Skip during static generation for error pages etc.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const errors: string[] = [];

  if (!process.env.DATABASE_URL) errors.push("DATABASE_URL");
  if (!process.env.SESSION_SECRET) errors.push("SESSION_SECRET");

  if (errors.length > 0 && process.env.NODE_ENV === "production") {
    throw new Error(
      `Missing required environment variables: ${errors.join(", ")}`
    );
  }
}

export const env = {
  databaseUrl: process.env.DATABASE_URL!,
  sessionSecret: process.env.SESSION_SECRET!,
  isProd: process.env.NODE_ENV === "production",
  isDev: process.env.NODE_ENV !== "production",
};

validate();
