import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toSQLiteTimestamp(jsDate: Date): string {
  const pad = (n: number): string => (n < 10 ? "0" + n : n.toString());
  return `${jsDate.getFullYear()}-${pad(jsDate.getMonth() + 1)}-${pad(
    jsDate.getDate(),
  )} ${pad(jsDate.getHours())}:${pad(jsDate.getMinutes())}:${pad(
    jsDate.getSeconds(),
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
