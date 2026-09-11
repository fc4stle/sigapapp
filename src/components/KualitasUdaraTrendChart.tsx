"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createSupabaseAnonClient } from "@/lib/supabase-anon";
import type { TimeRange } from "./TimeRangeToggle";

interface Props {
  range: TimeRange;
  wilayahTerdekat: string | null;
}

interface Pm25Point {
  waktu: string;
  value: number;
}

const RANGE_MS: Record<TimeRange, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

function formatWaktu(iso: string, range: TimeRange): string {
  const date = new Date(iso);
  if (range === "24h") {
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(date);
  }
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatWaktuTooltip(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(date);
}

type TrendDirection = "up" | "down" | "flat";

function getTrend(data: Pm25Point[]): TrendDirection {
  if (data.length < 2) return "flat";
  const last = data[data.length - 1].value;
  const prev = data[data.length - 2].value;
  if (last > prev) return "up";
  if (last < prev) return "down";
  return "flat";
}

function TrendIndicator({ data }: { data: Pm25Point[] }) {
  const trend = getTrend(data);
  if (trend === "flat") return null;

  const color = trend === "up" ? "#ef4444" : "#22c55e";
  const arrow = trend === "up" ? "▲" : "▼";
  const label = trend === "up" ? "Meningkat" : "Menurun";

  return (
    <div
      className="flex items-center gap-1"
      style={{ fontSize: "11px", color, fontFamily: "var(--font-ibm-plex-mono)" }}
      title={label}
      aria-label={`Tren PM2.5 ${label.toLowerCase()}`}
    >
      <span>{arrow}</span>
      <span>{label}</span>
    </div>
  );
}

export default function KualitasUdaraTrendChart({
  range,
  wilayahTerdekat,
}: Props) {
  const [data, setData] = useState<Pm25Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wilayahTerdekat) {
      return;
    }

    let isMounted = true;
    setLoading(true);

    async function fetchData() {
      const supabase = createSupabaseAnonClient();
      const sejak = new Date(Date.now() - RANGE_MS[range]).toISOString();
      const { data, error } = await supabase
        .from("kualitas_udara")
        .select("waktu, value")
        .eq("location_name", wilayahTerdekat)
        .ilike("parameter", "pm2.5")
        .gte("waktu", sejak)
        .order("waktu", { ascending: true });

      if (isMounted) {
        setData(!error && data ? data : []);
        setLoading(false);
      }
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [range, wilayahTerdekat]);

  if (!wilayahTerdekat) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        Memuat tren kualitas udara...
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <p className="text-sm text-muted">
        Belum cukup data untuk menampilkan tren. Data akan bertambah seiring
        waktu, atau klik Perbarui data untuk menambah titik baru.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatWaktu(d.waktu, range),
  }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Tren PM2.5 di {wilayahTerdekat}
        </h3>
        <TrendIndicator data={data} />
      </div>
      <div
        className="h-[260px] w-full rounded"
        style={{ backgroundColor: "#181510" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#2A2620"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{
                fill: "#8A8270",
                fontSize: 11,
                fontFamily: "var(--font-ibm-plex-mono)",
              }}
              stroke="#2A2620"
            />
            <YAxis
              tick={{
                fill: "#8A8270",
                fontSize: 11,
                fontFamily: "var(--font-ibm-plex-mono)",
              }}
              stroke="#2A2620"
              width={32}
            />
            <Tooltip
              cursor={{ stroke: "#D99A3E", strokeWidth: 1 }}
              contentStyle={{
                backgroundColor: "#181510",
                border: "1px solid #D99A3E",
                borderRadius: 4,
                fontSize: 12,
              }}
              labelStyle={{ color: "#EDE6D8" }}
              itemStyle={{ color: "#D99A3E" }}
              formatter={(value) => [`${value} µg/m³`, "PM2.5"]}
              labelFormatter={(label, payload) =>
                payload?.[0]?.payload?.waktu
                  ? formatWaktuTooltip(payload[0].payload.waktu)
                  : label
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#D99A3E"
              strokeWidth={2}
              dot={{ r: 3, fill: "#D99A3E", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#D99A3E" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
