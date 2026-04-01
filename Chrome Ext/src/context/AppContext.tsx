import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { Theme, ToastType } from "../types";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface AppContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toast: Toast | null;
  showToast: (msg: string, type?: ToastType) => void;
  loading: boolean;
  loadingText: string;
  showLoading: (text?: string) => void;
  hideLoading: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [toast, setToast] = useState<Toast | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Loading…");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId = useRef(0);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const id = ++toastId.current;
    setToast({ id, message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const showLoading = useCallback((text = "Loading…") => {
    setLoadingText(text);
    setLoading(true);
  }, []);

  const hideLoading = useCallback(() => setLoading(false), []);

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        toast,
        showToast,
        loading,
        loadingText,
        showLoading,
        hideLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
