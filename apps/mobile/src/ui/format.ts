const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Format an ISO-8601 date string as a short, English, locale-independent date
 * (e.g. `7 Aug 2026`). Written by hand rather than via `Intl`/`toLocaleDateString`
 * so it renders identically under Hermes in Expo Go regardless of the device's
 * bundled ICU data. Falls back to the raw string if it can't be parsed.
 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
