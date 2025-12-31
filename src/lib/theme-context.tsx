import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getThemeFromCookie(): Theme {
  if (typeof document === "undefined") return "dark";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; theme=`);
  if (parts.length === 2) {
    const theme = parts.pop()?.split(";").shift();
    if (theme === "light" || theme === "dark") {
      return theme;
    }
  }
  return "dark";
}

function setThemeCookie(theme: Theme) {
  document.cookie = `theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // Load theme from cookie on mount
  useEffect(() => {
    const savedTheme = getThemeFromCookie();
    setTheme(savedTheme);
    document.documentElement.className = savedTheme;
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === "dark" ? "light" : "dark";
      setThemeCookie(newTheme);
      document.documentElement.className = newTheme;
      return newTheme;
    });
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default context for SSR
    return { theme: "dark" as Theme, toggleTheme: () => {} };
  }
  return context;
}
