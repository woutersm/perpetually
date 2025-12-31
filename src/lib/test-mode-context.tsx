import { createContext, useContext, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";

interface TestModeContextType {
  isTestMode: boolean;
  setTestMode: (value: boolean) => void;
  toggleTestMode: () => void;
}

const TestModeContext = createContext<TestModeContextType | undefined>(undefined);

const TEST_MODE_COOKIE = "perpetually_test_mode";

function setTestModeCookie(value: boolean): void {
  if (typeof document === "undefined") return;
  // Set cookie with 1 year expiry, accessible across the site
  document.cookie = `${TEST_MODE_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function TestModeProvider({
  children,
  initialValue = false,
}: {
  children: React.ReactNode;
  initialValue?: boolean;
}) {
  const router = useRouter();

  // Use the server-provided initial value (read from cookie in beforeLoad)
  const isTestMode = initialValue;

  const toggleTestMode = useCallback(() => {
    const newValue = !isTestMode;
    setTestModeCookie(newValue);
    // Invalidate router to refetch all loaders with new test mode
    router.invalidate();
  }, [router, isTestMode]);

  const setTestMode = useCallback(
    (value: boolean) => {
      setTestModeCookie(value);
      router.invalidate();
    },
    [router]
  );

  return (
    <TestModeContext.Provider value={{ isTestMode, setTestMode, toggleTestMode }}>
      {children}
    </TestModeContext.Provider>
  );
}

export function useTestMode() {
  const context = useContext(TestModeContext);
  if (!context) {
    // Return default for SSR or when used outside provider
    return {
      isTestMode: false,
      setTestMode: () => {},
      toggleTestMode: () => {},
    };
  }
  return context;
}
