import { format } from "date-fns";

/** Formats as "9 Oct 2027", the one date format used across the app */
export function formatDate(date: Date | string | null | undefined, fallback = "—") {
  return date ? format(new Date(date), "d MMM yyyy") : fallback;
}

export type LicenseState = "active" | "expired" | "disabled";

/** Expired isn't stored; it's an active license past its expiry date */
export function licenseState(status: string, expiresAt: Date | string | null): LicenseState {
  if (status === "disabled") return "disabled";
  if (expiresAt && new Date(expiresAt) < new Date()) return "expired";
  return "active";
}
