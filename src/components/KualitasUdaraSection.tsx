"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { capitalize } from "@/lib/format-wilayah";
import KualitasUdaraList from "./KualitasUdaraList";

const PetaKualitasUdara = dynamic(() => import("./PetaKualitasUdara"), {
  ssr: false,
});

interface KualitasUdaraItem {
  location_name: string;
  parameter: string;
  value: number;
  unit: string;
  lintang: number;
  bujur: number;
  waktu: string;
}

interface ApiData {
  data: KualitasUdaraItem[];
  koordinat: { lat: number; lon: number };
  total_sensor: number;
  distance_km: number | null;
  wilayah_terdekat: string | null;
  pesan?: string;
}

interface Props {
  center?: [number, number];
  wilayah?: string;
}

export default function KualitasUdaraSection({ center, wilayah }: Props) {
  const [dataList, setDataList] = useState<KualitasUdaraItem[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [wilayahTerdekat, setWilayahTerdekat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState<string | null>(null);
  const hasCustomCenter = center !== undefined;
  const displayWilayah = wilayah ? capitalize(wilayah) : null;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setPesan(null);
    setDistanceKm(null);
    setWilayahTerdekat(null);

    async function fetchData() {
      // Kalau ada center custom (wilayah dari URL), pakai API dinamis
      if (hasCustomCenter && center) {
        try {
          const res = await fetch(
            `/api/kualitas-udara?lat=${center[0]}&lon=${center[1]}`
          );
          if (!res.ok) {
            if (isMounted) {
              setPesan("Gagal memuat data kualitas udara dari server");
              setDataList([]);
              setLoading(false);
            }
            return;
          }
          const json: ApiData = await res.json();
          if (isMounted) {
            const items: KualitasUdaraItem[] = json.data ?? [];
            setDataList(items);
            setDistanceKm(json.distance_km ?? null);
            setWilayahTerdekat(json.wilayah_terdekat ?? null);
            if (items.length === 0 && json.pesan) {
              setPesan(json.pesan);
            }
            setLoading(false);
          }
        } catch {
          if (isMounted) {
            setPesan("Gagal menghubungi server kualitas udara");
            setDataList([]);
            setLoading(false);
          }
        }
        return;
      }

      // Default: fetch dari Supabase (data historis cron)
      try {
        const { createSupabaseAnonClient } = await import("@/lib/supabase-anon");
        const supabase = createSupabaseAnonClient();
        const { data, error } = await supabase
          .from("kualitas_udara")
          .select("location_name, parameter, value, unit, lintang, bujur, waktu")
          .order("waktu", { ascending: false });

        if (isMounted) {
          if (error) {
            setPesan("Gagal memuat data kualitas udara");
            setDataList([]);
          } else {
            setDataList(data ?? []);
          }
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setPesan("Gagal menghubungi server kualitas udara");
          setDataList([]);
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [hasCustomCenter, center]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">Kualitas udara</h2>
          {displayWilayah && !loading && (
            <p className="text-sm text-muted">
              Sensor dalam radius 25km dari {displayWilayah}
            </p>
          )}
        </div>
        {displayWilayah && !loading && distanceKm !== null && wilayahTerdekat && (
          <p className="text-xs text-muted">
            Sensor terdekat: <span className="font-medium text-foreground">{wilayahTerdekat}</span> ({distanceKm} km dari {displayWilayah})
          </p>
        )}
      </div>

      <div className="h-[500px] w-full overflow-hidden border border-border">
        <PetaKualitasUdara center={center} />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Memuat data kualitas udara...
        </div>
      )}

      {!loading && pesan && (
        <p className="text-sm text-warning">{pesan}</p>
      )}

      {!loading && dataList.length > 0 && (
        <KualitasUdaraList items={dataList} />
      )}
    </section>
  );
}
