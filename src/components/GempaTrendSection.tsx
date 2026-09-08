"use client";

import GempaTrendChart from "./GempaTrendChart";
import { useTrendRange } from "./TrendRangeProvider";

export default function GempaTrendSection() {
  const range = useTrendRange();
  return <GempaTrendChart range={range} />;
}
