"use client";

import { useState } from "react";

interface Gempa {
  magnitude: number;
  kedalaman: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  lintang: number;
  bujur: number;
}

interface Props {
  gempaList: Gempa[];
}

export default function AccessibleMarkers({ gempaList }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (gempaList.length === 0) return null;

  return (
    <>
      {gempaList.map((gempa, index) => (
        <button
          key={index}
          type="button"
          tabIndex={0}
          onClick={() => setActiveIndex(index)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveIndex(index);
            }
          }}
          aria-label={`Gempa ${gempa.magnitude}, ${gempa.wilayah}, ${gempa.tanggal} ${gempa.jam}`}
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
          Gempa {gempa.magnitude} - {gempa.wilayah}
        </button>
      ))}
      {activeIndex !== null && gempaList[activeIndex] && (
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
          Magnitude: {gempaList[activeIndex].magnitude}, Kedalaman:{" "}
          {gempaList[activeIndex].kedalaman}, Wilayah:{" "}
          {gempaList[activeIndex].wilayah}, Waktu: {gempaList[activeIndex].tanggal}{" "}
          {gempaList[activeIndex].jam}
        </div>
      )}
    </>
  );
}
