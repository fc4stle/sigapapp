"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

interface UdaraHoverContextValue {
  hoveredUdaraKey: string | null;
  setHoveredUdaraKey: Dispatch<SetStateAction<string | null>>;
}

const UdaraHoverContext = createContext<UdaraHoverContextValue>({
  hoveredUdaraKey: null,
  setHoveredUdaraKey: () => {},
});

export function useUdaraHover(): UdaraHoverContextValue {
  return useContext(UdaraHoverContext);
}

export function udaraKey(loc: { location_name: string }): string {
  return loc.location_name;
}

export default function UdaraHoverProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [hoveredUdaraKey, setHoveredUdaraKey] = useState<string | null>(null);

  return (
    <UdaraHoverContext.Provider value={{ hoveredUdaraKey, setHoveredUdaraKey }}>
      {children}
    </UdaraHoverContext.Provider>
  );
}
