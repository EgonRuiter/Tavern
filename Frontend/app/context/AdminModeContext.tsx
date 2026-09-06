import React, { createContext, useContext, useEffect, useState } from "react";
import AuthContext from "./AuthContext";

export const ADMIN_MODE_STORAGE_KEY = "tavern_admin_mode";
export const ADMIN_MODE_CHANGED_EVENT = "tavern_admin_mode_changed";

export interface AdminModeContextType {
  isAdminUser: boolean;
  adminMode: boolean;
  setAdminMode: (enabled: boolean) => void;
  toggleAdminMode: () => void;
}

export function isAdminModeActive(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return true;
  return localStorage.getItem(ADMIN_MODE_STORAGE_KEY) !== "false";
}

const AdminModeContext = createContext<AdminModeContextType>({
  isAdminUser: false,
  adminMode: true,
  setAdminMode: () => {},
  toggleAdminMode: () => {},
});

export function AdminModeProvider({ children }: { children: React.ReactNode }) {
  const authService = useContext(AuthContext);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminMode, setAdminModeState] = useState<boolean>(() =>
    isAdminModeActive(),
  );

  useEffect(() => {
    if (!authService) {
      setIsAdminUser(false);
      return;
    }

    let cancelled = false;
    const checkAdmin = async () => {
      try {
        const token = await authService.getTokenParsed();
        if (!cancelled && token) {
          setIsAdminUser(
            Boolean(
              token.is_admin === true || (token.is_admin as any) === "true",
            ),
          );
        }
      } catch {
        if (!cancelled) {
          setIsAdminUser(false);
        }
      }
    };

    void checkAdmin();
    const interval = setInterval(() => {
      void checkAdmin();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [authService]);

  useEffect(() => {
    const handleStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ adminMode: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.adminMode === "boolean") {
        setAdminModeState(customEvent.detail.adminMode);
      } else {
        setAdminModeState(isAdminModeActive());
      }
    };

    window.addEventListener(ADMIN_MODE_CHANGED_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener(ADMIN_MODE_CHANGED_EVENT, handleStorageChange);
    };
  }, []);

  const setAdminMode = (enabled: boolean) => {
    setAdminModeState(enabled);
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(ADMIN_MODE_STORAGE_KEY, enabled ? "true" : "false");
      window.dispatchEvent(
        new CustomEvent(ADMIN_MODE_CHANGED_EVENT, {
          detail: { adminMode: enabled },
        }),
      );
    }
  };

  const toggleAdminMode = () => {
    setAdminMode(!adminMode);
  };

  return (
    <AdminModeContext.Provider
      value={{
        isAdminUser,
        adminMode: isAdminUser ? adminMode : false,
        setAdminMode,
        toggleAdminMode,
      }}
    >
      {children}
    </AdminModeContext.Provider>
  );
}

export function useAdminMode() {
  return useContext(AdminModeContext);
}
