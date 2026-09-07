"use client";

import { useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import type { KualitasUdaraItem, LocationData } from "@/types/kualitas-udara";

interface Props {
  dataList: LocationData[];
}

export default function AccessibleAirQualityMarkers({ dataList }: Props) {
  const map = useMap();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    setActiveIndex(null);
  }, [dataList]);

  function handleFocus(index: number) {
    setActiveIndex(index);
    const loc = dataList[index];
    map.panTo([loc.lintang, loc.bujur], { animate: true, duration: 0.5 });
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleFocus(index);
    }
  }

  function describeLocation(loc: LocationData): string {
    const parts = [`${loc.location_name}`];
    for (const item of loc.items) {
      parts.push(`${item.parameter}: ${item.value} ${item.unit} (${item.sumber})`);
    }
    return parts.join(", ");
  }

  if (dataList.length === 0) return null;

  return (
    <>
      {dataList.map((loc, index) => (
        <button
          key={index}
          type="button"
          tabIndex={0}
          onFocus={() => handleFocus(index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          aria-label={describeLocation(loc)}
          style={{
            position: "absolute",
            left: "-9999px",
            width: "1px",
            height: "1px",
            padding: "8px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: "0",
          }}
          onBlur={() => setActiveIndex(null)}
        >
          {loc.location_name}
        </button>
      ))}
      {activeIndex !== null && dataList[activeIndex] && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            left: "-9999px",
            width: "1px",
            height: "1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
          }}
        >
          {describeLocation(dataList[activeIndex])}
        </div>
      )}
    </>
  );
}
