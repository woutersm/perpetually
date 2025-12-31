import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toKm(meters: number, decimals = 1): string {
  return (meters / 1000).toFixed(decimals);
}

export function toTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [h, m > 9 ? m : h ? "0" + m : m || "0", s > 9 ? s : "0" + s]
    .filter((a) => a)
    .join(":");
}

export function secondsToHours(seconds: number): number {
  return seconds / 3600;
}

export function speedToPace(speedKmh: number): string {
  const minutesPerHour = 60;
  const paceInMinutes = minutesPerHour / speedKmh;
  const minutes = Math.floor(paceInMinutes);
  const seconds = Math.round((paceInMinutes - minutes) * 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function toKmh(speedMs: number): string {
  return (speedMs * 3.6).toFixed(1);
}

export function timeAndDistanceToSpeedKmh(
  time: number,
  distance: number
): string {
  if (time === 0) {
    return "0.0";
  }
  const speedMs = distance / time;

  return toKmh(speedMs);
}

export function toFormattedDate(date: string) {
  return new Date(date).toLocaleDateString("nl-NL", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

export function calculateDiff(old: number | undefined, current: number) {
  if (!old) {
    return 0;
  }
  return (current - old).toFixed(1);
}

export function calculateDiffP(old: number | undefined, current: number) {
  if (!old) {
    return 0;
  }

  return (((current - old) / current) * 100).toFixed(1);
}

export function toSQLiteTimestamp(jsDate: Date): string {
  const pad = (n: number): string => (n < 10 ? "0" + n : n.toString());
  return `${jsDate.getFullYear()}-${pad(jsDate.getMonth() + 1)}-${pad(
    jsDate.getDate()
  )} ${pad(jsDate.getHours())}:${pad(jsDate.getMinutes())}:${pad(
    jsDate.getSeconds()
  )}`;
}

export function toShortDate(date: string | null) {
  if (!date) {
    return undefined;
  }

  return format(date, "yyyy-MM-dd");
}

export function toLongDate(date: string) {
  return format(date, "yyyy-MM-dd HH:mm");
}
