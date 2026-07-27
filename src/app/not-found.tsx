import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold mb-2">Page not found</h1>
        <p className="text-sm text-[var(--text-2)] mb-6">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-fg)] font-medium hover:bg-[var(--primary-hover)] transition-all"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
