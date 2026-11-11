const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STALE_DAYS = 30;

/** UTC calendar date as YYYY-MM-DD. */
export function buildDate(now: Date = new Date()): string {
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** True when verifiedDate is more than 30 days before today. Both values are YYYY-MM-DD. */
export function isStale(verifiedDate: string, today: string): boolean {
  const verified = Date.parse(`${verifiedDate}T00:00:00.000Z`);
  const current = Date.parse(`${today}T00:00:00.000Z`);
  return current - verified > STALE_DAYS * MS_PER_DAY;
}
