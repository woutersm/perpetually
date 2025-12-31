import { useTheme } from "@/lib/theme-context";

export function useChartColors() {
  const { theme } = useTheme();

  return {
    primary: theme === "dark" ? "#ffffff" : "#000000",
    secondary: theme === "dark" ? "#9CA3AF" : "#4B5563",
    text: theme === "dark" ? "#ffffff" : "#000000",
  };
}
