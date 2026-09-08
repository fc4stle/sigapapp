"use client";

export type TimeRange = "24h" | "7d";

interface Props {
  range: TimeRange;
  onChange: (range: TimeRange) => void;
}

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "24 jam" },
  { value: "7d", label: "7 hari" },
];

export default function TimeRangeToggle({ range, onChange }: Props) {
  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="Rentang waktu tren"
    >
      {OPTIONS.map((option) => {
        const active = range === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className="rounded border px-3 py-1.5 text-sm font-medium transition-colors"
            style={
              active
                ? { borderColor: "#D99A3E", color: "#D99A3E" }
                : { borderColor: "#2A2620", color: "#8A8270" }
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
