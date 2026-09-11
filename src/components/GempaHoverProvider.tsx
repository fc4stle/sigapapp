"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

interface GempaHoverContextValue {
  hoveredGempaKey: string | null;
  setHoveredGempaKey: Dispatch<SetStateAction<string | null>>;
}

const GempaHoverContext = createContext<GempaHoverContextValue>({
  hoveredGempaKey: null,
  setHoveredGempaKey: () => {},
});

export function useGempaHover(): GempaHoverContextValue {
  return useContext(GempaHoverContext);
}

export function gempaKey(g: {
  lintang: number;
  bujur: number;
  tanggal: string;
  jam: string;
}): string {
  return `${g.lintang}_${g.bujur}_${g.tanggal}_${g.jam}`;
}

export default function GempaHoverProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [hoveredGempaKey, setHoveredGempaKey] = useState<string | null>(null);

  return (
    <GempaHoverContext.Provider value={{ hoveredGempaKey, setHoveredGempaKey }}>
      {children}
    </GempaHoverContext.Provider>
  );
}
