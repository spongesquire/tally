import { MEMBER_COLOURS, getColour, type MemberColourKey } from "@/lib/product-config";

/** Avatar component — circular with initials, coloured by member colour key */
export function Avatar({
  name,
  colourKey,
  size = 40,
}: {
  name: string;
  colourKey: string;
  size?: number;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const c = getColour(colourKey);
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold shrink-0"
      style={{
        backgroundColor: c.fill,
        color: c.fg,
        width: size,
        height: size,
        fontSize: size * 0.38,
      }}
    >
      {initials || "?"}
    </div>
  );
}

/** Stacked avatar group for showing multiple members compactly */
export function AvatarStack({
  members,
  max = 4,
  size = 32,
}: {
  members: Array<{ displayName: string; colourKey: string }>;
  max?: number;
  size?: number;
}) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;
  return (
    <div className="flex items-center">
      {visible.map((m, i) => (
        <div
          key={i}
          className="rounded-full ring-2 ring-[var(--surface)]"
          style={{ marginLeft: i === 0 ? 0 : -size * 0.3, zIndex: visible.length - i }}
        >
          <Avatar name={m.displayName} colourKey={m.colourKey} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="flex items-center justify-center rounded-full font-medium bg-[var(--surface-2)] text-[var(--text-2)] ring-2 ring-[var(--surface)]"
          style={{
            width: size,
            height: size,
            fontSize: size * 0.35,
            marginLeft: -size * 0.3,
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

/** Format cents (minor units) as a signed display string */
export function formatSigned(minor: number, currency = "AUD"): string {
  const sign = minor > 0 ? "+" : minor < 0 ? "−" : "";
  const abs = Math.abs(minor);
  const symbol = currencySymbol(currency);
  const major = (abs / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${symbol}${major}`;
}

export function formatUnsigned(minor: number, currency = "AUD"): string {
  const symbol = currencySymbol(currency);
  const major = (minor / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${major}`;
}

export function currencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    AUD: "$", USD: "$", NZD: "$", GBP: "£", EUR: "€", JPY: "¥",
  };
  return symbols[currency] ?? `${currency} `;
}

/** Format a date for display in Australian English */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/** Net balance display: positive = green (owed), negative = red (owes), zero = settled */
export function netStatus(net: number): {
  label: string;
  colour: string;
  bg: string;
} {
  if (net > 0) {
    return { label: "You're owed", colour: "var(--success)", bg: "var(--positive-bg)" };
  } else if (net < 0) {
    return { label: "You owe", colour: "var(--danger)", bg: "var(--negative-bg)" };
  }
  return { label: "Settled up", colour: "var(--text-2)", bg: "var(--surface-2)" };
}

export { MEMBER_COLOURS, getColour };
export type { MemberColourKey };
