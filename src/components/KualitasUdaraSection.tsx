"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { capitalize } from "@/lib/format-wilayah";
import KualitasUdaraList from "./KualitasUdaraList";
import KualitasUdaraTrendChart from "./KualitasUdaraTrendChart";
import { useTrendRange } from "./TrendRangeProvider";
import type { KualitasUdaraItem, SumberData } from "@/types/kualitas-udara";

const PetaKualitasUdara = dynamic(() => import("./PetaKualitasUdara"), {
  ssr: false,
});

interface ApiDataOpenAQ {
  data: KualitasUdaraItem[];
  koordinat: { lat: number; lon: number };
  total_sensor: number;
  distance_km: number | null;
  wilayah_terdekat: string | null;
  pesan?: string;
}

interface ApiDataIspu {
  data: KualitasUdaraItem[];
  koordinat: { lat: number; lon: number } | null;
  total_sensor: number;
  ispu_active: boolean;
  pesan?: string;
}

interface Props {
  center?: [number, number];
  wilayah?: string;
}

export default function KualitasUdaraSection({ center, wilayah }: Props) {
  const range = useTrendRange();
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
      if (hasCustomCenter && center) {
        try {
          const [openAqRes, ispuRes] = await Promise.allSettled([
            fetch(`/api/kualitas-udara?lat=${center[0]}&lon=${center[1]}`),
            fetch(`/api/ispu?lat=${center[0]}&lon=${center[1]}`),
          ]);

          const allItems: KualitasUdaraItem[] = [];
          const pesanParts: string[] = [];

          if (openAqRes.status === "fulfilled" && openAqRes.value.ok) {
            const json: ApiDataOpenAQ = await openAqRes.value.json();
            const items: KualitasUdaraItem[] = (json.data ?? []).map((item) => ({
              ...item,
              sumber: item.sumber ?? ("OpenAQ" as SumberData),
            }));
            allItems.push(...items);
            setDistanceKm(json.distance_km ?? null);
            setWilayahTerdekat(json.wilayah_terdekat ?? null);
            if (items.length === 0 && json.pesan) {
              pesanParts.push(`OpenAQ: ${json.pesan}`);
            }
          } else {
            pesanParts.push("OpenAQ: gagal memuat data");
          }

          if (ispuRes.status === "fulfilled" && ispuRes.value.ok) {
            const json: ApiDataIspu = await ispuRes.value.json();
            if (json.data && json.data.length > 0) {
              const items: KualitasUdaraItem[] = json.data.map((item) => ({
                ...item,
                sumber: "KLHK" as SumberData,
              }));
              allItems.push(...items);
            } else if (json.pesan) {
              pesanParts.push(`KLHK ISPU: ${json.pesan}`);
            }
          }

          if (isMounted) {
            setDataList(allItems);
            if (allItems.length === 0 && pesanParts.length > 0) {
              setPesan(pesanParts.join(". "));
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
            const items: KualitasUdaraItem[] = (data ?? []).map((item) => ({
              ...item,
              sumber: "OpenAQ" as SumberData,
            }));
            setDataList(items);
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
        <p className="text-xs text-muted">
          Data kualitas udara dari sensor pemantauan terdekat, diperbarui berkala
        </p>
        {displayWilayah && !loading && distanceKm !== null && wilayahTerdekat && (
          <p className="text-xs text-muted">
            Sensor terdekat: <span className="font-medium text-foreground">{wilayahTerdekat}</span> ({distanceKm} km dari {displayWilayah})
          </p>
        )}
      </div>

      <div className="h-[500px] w-full overflow-hidden border border-border">
        <PetaKualitasUdara center={center} dataList={dataList} />
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

      {!loading && (
        <KualitasUdaraTrendChart
          range={range}
          wilayahTerdekat={wilayahTerdekat}
        />
      )}
    </section>
  );
}
