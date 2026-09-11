"use client";

import { udaraKey, useUdaraHover } from "./UdaraHoverProvider";
import type { KualitasUdaraItem, LocationData } from "@/types/kualitas-udara";

interface Props {
  items: KualitasUdaraItem[];
}

const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SCALE_MAX = 150;

function getGaugeColor(value: number): string {
  if (value < 35) return "#6B8F5A";
  if (value <= 55) return "#B08A3E";
  return "#A8672E";
}

function normalizeParameter(param: string): string {
  const p = param.toLowerCase().replace(/\s+/g, "");
  if (p === "pm2.5" || p === "pm25") return "pm25";
  if (p === "pm10") return "pm10";
  return p;
}

function groupByLocation(items: KualitasUdaraItem[]): LocationData[] {
  const map = new Map<string, LocationData>();

  for (const item of items) {
    const existing = map.get(item.location_name) ?? {
      location_name: item.location_name,
      lintang: 0,
      bujur: 0,
      items: [],
    };

    if (existing.items.length === 0) {
      existing.lintang = item.lintang;
      existing.bujur = item.bujur;
    }

    existing.items.push(item);
    map.set(item.location_name, existing);
  }

  return Array.from(map.values());
}

function Gauge({ item }: { item: KualitasUdaraItem }) {
  const progress = Math.min(Number(item.value) / SCALE_MAX, 1);
  const dashoffset = CIRCUMFERENCE * (1 - progress);
  const color = getGaugeColor(Number(item.value));
  const value = Number(item.value).toFixed(1);
  const status =
    Number(item.value) < 35
      ? "baik"
      : Number(item.value) <= 55
        ? "sedang"
        : "tidak sehat";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        viewBox="0 0 100 100"
        className="w-[78px]"
        role="img"
        aria-label={`${item.parameter}: ${value} ${item.unit}, kategori ${status}`}
      >
        <circle cx="50" cy="50" r={RADIUS} stroke="#221F19" strokeWidth={7} fill="none" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          stroke={color}
          strokeWidth={7}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="48" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="16" fill="#EDE6D8">
          {value}
        </text>
        <text x="50" y="62" textAnchor="middle" fontSize="8" fill="#8B96A5">
          {item.unit}
        </text>
      </svg>
      <span style={{ fontSize: "12px", color: "#8A8270" }}>{item.parameter}</span>
    </div>
  );
}

function LocationBlock({ loc }: { loc: LocationData }) {
  const { hoveredUdaraKey, setHoveredUdaraKey } = useUdaraHover();
  const isHovered = hoveredUdaraKey === udaraKey(loc);

  return (
    <div
      className="rounded border border-[#2A2620] p-4 transition-colors duration-200"
      style={{
        minWidth: "220px",
        backgroundColor: isHovered ? "rgba(237, 230, 216, 0.04)" : "transparent",
        borderLeftColor: isHovered ? "#D99A3E" : "#2A2620",
        borderLeftWidth: isHovered ? "3px" : "1px",
      }}
      onMouseEnter={() => setHoveredUdaraKey(udaraKey(loc))}
      onMouseLeave={() => setHoveredUdaraKey(null)}
      onClick={() =>
        setHoveredUdaraKey((current) =>
          current === udaraKey(loc) ? null : udaraKey(loc)
        )
      }
    >
      <p style={{ fontSize: "13px", color: "#EDE6D8", fontWeight: 500 }} className="mb-3">
        {loc.location_name}
      </p>

      {loc.items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-3">
          {loc.items.map((item, i) => (
            <div key={i} className="flex justify-center">
              <Gauge item={item} />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 pt-2 border-t border-[#2A2620]">
        {loc.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <span style={{ fontSize: "11px", color: "#8B96A5" }}>{item.parameter}</span>
            <div className="flex items-center gap-1">
              <span style={{ fontSize: "11px", color: "#B0A898", fontFamily: "var(--font-mono)" }}>
                {Number(item.value).toFixed(1)} {item.unit}
              </span>
              <span
                className="text-[10px] px-1 rounded"
                style={{
                  background: item.sumber === "KLHK" ? "#1e3a5f" : "#3d2e1f",
                  color: item.sumber === "KLHK" ? "#8ec5fc" : "#f5d78e",
                }}
              >
                {item.sumber}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KualitasUdaraList({ items }: Props) {
  const locations = groupByLocation(items);

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
      {locations.map((loc) => (
        <LocationBlock key={loc.location_name} loc={loc} />
      ))}
    </div>
  );
}
