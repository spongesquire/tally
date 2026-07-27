"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-sm text-center">
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm text-[var(--text-2)] mb-6">
              An unexpected error occurred. Your data is safe — try again.
            </p>
            {error.digest && (
              <p className="text-xs text-[var(--text-3)] mb-4 font-mono">
                Reference: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              className="px-6 py-3 rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-fg)] font-medium hover:bg-[var(--primary-hover)] transition-all"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
