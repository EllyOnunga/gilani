import { createContext, useContext } from "react";

export type LayoutContextValue = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  user: { id: string; [key: string]: any } | null;
  createNewThread: () => void | Promise<void>;
  requestRenameThread: (id: string, title: string) => void;
  requestDeleteThread: (id: string) => void;
};

export const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error("useLayout must be used within LayoutContext.Provider (inside _authenticated.tsx)");
  }
  return ctx;
}
