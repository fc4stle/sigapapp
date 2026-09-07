interface KualitasUdaraItem {
  location_name: string;
  value: number;
  unit: string;
  parameter: string;
}

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

interface LocationData {
  location_name: string;
  pm25?: KualitasUdaraItem;
  pm10?: KualitasUdaraItem;
  others: KualitasUdaraItem[];
}

function groupByLocation(items: KualitasUdaraItem[]): LocationData[] {
  const map = new Map<string, LocationData>();

  for (const item of items) {
    const normalized = normalizeParameter(item.parameter);
    const existing = map.get(item.location_name) ?? {
      location_name: item.location_name,
      others: [],
    };

    if (normalized === "pm25") {
      existing.pm25 = item;
    } else if (normalized === "pm10") {
      existing.pm10 = item;
    } else {
      existing.others.push(item);
    }

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
  return (
    <div className="rounded border border-[#2A2620] p-4" style={{ minWidth: "220px" }}>
      <p style={{ fontSize: "13px", color: "#EDE6D8", fontWeight: 500 }} className="mb-3">
        {loc.location_name}
      </p>

      {(loc.pm25 || loc.pm10) && (
        <div className="flex items-center justify-center gap-4 mb-3">
          {loc.pm25 && <Gauge item={loc.pm25} />}
          {loc.pm10 && <Gauge item={loc.pm10} />}
        </div>
      )}

      {loc.others.length > 0 && (
        <div className="flex flex-col gap-1 pt-2 border-t border-[#2A2620]">
          {loc.others.map((other, i) => (
            <div key={i} className="flex items-center justify-between">
              <span style={{ fontSize: "11px", color: "#8B96A5" }}>{other.parameter}</span>
              <span style={{ fontSize: "11px", color: "#B0A898", fontFamily: "var(--font-mono)" }}>
                {Number(other.value).toFixed(1)} {other.unit}
              </span>
            </div>
          ))}
        </div>
      )}
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
