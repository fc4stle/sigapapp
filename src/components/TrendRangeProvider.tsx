"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import TimeRangeToggle, { type TimeRange } from "./TimeRangeToggle";

const TrendRangeContext = createContext<TimeRange>("24h");

export function useTrendRange(): TimeRange {
  return useContext(TrendRangeContext);
}

export default function TrendRangeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [range, setRange] = useState<TimeRange>("24h");

  return (
    <TrendRangeContext.Provider value={range}>
      <TimeRangeToggle range={range} onChange={setRange} />
      {children}
    </TrendRangeContext.Provider>
  );
}
