import { createSupabaseAnonClient } from "@/lib/supabase-anon";
import { geocodeWilayah } from "@/lib/geocode";
import { capitalize, validasiWilayah } from "@/lib/format-wilayah";
import PetaGempaWrapper from "@/components/PetaGempaWrapper";
import KualitasUdaraSection from "@/components/KualitasUdaraSection";
import RefreshButton from "@/components/RefreshButton";
import PencarianWilayah from "@/components/PencarianWilayah";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const YOGYAKARTA_CENTER: [number, number] = [-7.7956, 110.3695];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ wilayah?: string }>;
}): Promise<Metadata> {
  const { wilayah } = await searchParams;
  if (wilayah) {
    const v = validasiWilayah(wilayah);
    if (v.valid) {
      const nama = capitalize(v.nama);
      return {
        title: `Sigap ${nama}`,
        description: `Pantau gempa dan udara di ${nama}`,
      };
    }
  }
  return {
    title: "Sigap Yogyakarta",
    description: "Pantau gempa dan udara di wilayahmu",
  };
}

const BULAN_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  mei: 4,
  may: 4,
  jun: 5,
  jul: 6,
  ags: 7,
  aug: 7,
  sep: 8,
  okt: 9,
  oct: 9,
  nov: 10,
  des: 11,
  dec: 11,
};

function parseGempaDateTime(tanggal: string, jam: string): Date | null {
  const tanggalMatch = tanggal.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!tanggalMatch) return null;
  const [, hari, bulanRaw, tahun] = tanggalMatch;
  const bulanIndex = BULAN_INDEX[bulanRaw.toLowerCase()];
  if (bulanIndex === undefined) return null;

  const jamMatch = jam.trim().match(/^(\d{2}):(\d{2}):(\d{2})/);
  if (!jamMatch) return null;
  const [, jj, mm, ss] = jamMatch;

  return new Date(
    Number(tahun),
    bulanIndex,
    Number(hari),
    Number(jj),
    Number(mm),
    Number(ss),
  );
}

function formatRelativeTime(diffMs: number): string {
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 60) {
    return `Diperbarui ${minutes} menit yang lalu`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `Diperbarui ${hours} jam yang lalu`;
  }

  const days = Math.round(hours / 24);
  return `Diperbarui ${days} hari yang lalu`;
}

const BULAN: Record<string, string> = {
  jan: "Januari",
  feb: "Februari",
  mar: "Maret",
  apr: "April",
  mei: "Mei",
  may: "Mei",
  jun: "Juni",
  jul: "Juli",
  ags: "Agustus",
  aug: "Agustus",
  sep: "September",
  okt: "Oktober",
  oct: "Oktober",
  nov: "November",
  des: "Desember",
  dec: "Desember",
};

function formatTanggalGempa(tanggal: string): string {
  const match = tanggal.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+\d{4}$/);
  if (!match) return tanggal;
  const [, hari, bulanRaw] = match;
  const bulan = BULAN[bulanRaw.toLowerCase()] ?? bulanRaw;
  return `${Number(hari)} ${bulan}`;
}

function formatJamGempa(jam: string): string {
  const match = jam.trim().match(/^(\d{2}):(\d{2}):\d{2}\s*(.*)$/);
  if (!match) return jam;
  const [, jamStr, menit, zona] = match;
  return zona ? `${jamStr}.${menit} ${zona}` : `${jamStr}.${menit}`;
}

function formatWaktuUdara(waktu: string): string {
  const date = new Date(waktu);
  const tanggal = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Jakarta",
  }).format(date);
  const jam = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(date);
  return `${tanggal} pukul ${jam} WIB`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ wilayah?: string }>;
}) {
  const { wilayah } = await searchParams;

  let namaWilayah = "Yogyakarta";
  let pusatPeta = YOGYAKARTA_CENTER;
  let pesanWilayah: string | null = null;

  if (wilayah) {
    const v = validasiWilayah(wilayah);
    if (!v.valid) {
      pesanWilayah = v.pesan ?? "Nama wilayah tidak valid, menampilkan data Yogyakarta";
    } else {
      const hasil = await geocodeWilayah(v.nama);
      if (hasil) {
        namaWilayah = capitalize(v.nama);
        pusatPeta = [hasil.lat, hasil.lon];
      } else {
        pesanWilayah = "Wilayah tidak ditemukan, menampilkan data Yogyakarta";
      }
    }
  }

  const supabase = createSupabaseAnonClient();
  const { data: gempaList, error } = await supabase
    .from("gempa")
    .select("magnitude, wilayah, tanggal, jam, kedalaman")
    .order("date_time", { ascending: false });
  const { data: kualitasUdaraList, error: kualitasUdaraError } = await supabase
    .from("kualitas_udara")
    .select("location_name, parameter, value, unit, waktu")
    .order("waktu", { ascending: false });

  const isUdaraLama =
    !!kualitasUdaraList?.[0] &&
    // eslint-disable-next-line react-hooks/purity
    Date.now() - new Date(kualitasUdaraList[0].waktu).getTime() >
      24 * 60 * 60 * 1000;

  const gempaTime = gempaList?.[0]
    ? parseGempaDateTime(gempaList[0].tanggal, gempaList[0].jam)
    : null;
  const udaraTime = kualitasUdaraList?.[0]
    ? new Date(kualitasUdaraList[0].waktu)
    : null;
  const latestTime =
    gempaTime && udaraTime
      ? gempaTime.getTime() > udaraTime.getTime()
        ? gempaTime
        : udaraTime
      : (gempaTime ?? udaraTime);

  const updatedText = latestTime
    ? formatRelativeTime(Date.now() - latestTime.getTime())
    : null;

  const jumlahGempa = gempaList?.length ?? 0;
  const jumlahTitikUdara = new Set(
    (kualitasUdaraList ?? []).map((item) => item.location_name),
  ).size;
  const ringkasanText =
    jumlahGempa === 0 && jumlahTitikUdara === 0
      ? "Belum ada data hari ini"
      : `${jumlahGempa} gempa dan ${jumlahTitikUdara} titik pantau udara hari ini`;

  return (
    <div className="flex flex-1 flex-col items-center bg-background text-foreground">
      <svg
        viewBox="0 0 400 48"
        className="h-12 w-full text-accent"
        fill="none"
        aria-hidden="true"
      >
        <polyline
          points="0,24 24,24 44,8 64,40 84,16 104,28 124,10 144,34 164,24 184,24 204,6 224,36 244,24 264,24 284,14 304,30 324,24 344,24 364,6 384,40 400,24"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-waveform"
        />
      </svg>

      <main id="main-content" className="flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-1">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <span className="pulse-dot" aria-hidden="true" />
              <span
                style={{ fontSize: "12px", color: "#A89970" }}
                aria-live="polite"
                aria-atomic="true"
              >
                Memantau langsung
              </span>
            </div>
            {updatedText && (
              <span style={{ color: "#8A8270" }} className="text-sm">
                {updatedText}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sigap {namaWilayah}
          </h1>
          <p className="text-muted">Pantau gempa dan udara di wilayahmu</p>
          <p className="text-sm text-muted">{ringkasanText}</p>
          {pesanWilayah && (
            <p className="text-sm text-warning">{pesanWilayah}</p>
          )}
        </header>

        <PencarianWilayah defaultValue={wilayah} />

        <RefreshButton />

        <section className="flex flex-col gap-4 border-b border-border pb-10">
          <h2 className="text-lg font-semibold">Gempa terkini</h2>

          <div className="h-[500px] w-full overflow-hidden border border-border">
            <PetaGempaWrapper center={wilayah ? pusatPeta : undefined} />
          </div>

          {error ? (
            <p className="text-red-400">
              Gagal memuat data gempa: {error.message}
            </p>
          ) : !gempaList || gempaList.length === 0 ? (
            <p className="text-muted">Belum ada data gempa</p>
          ) : (
            <ul className="flex flex-col">
              {gempaList.map((gempa, index) => (
                <li
                  key={index}
                  className="flex flex-col gap-1 border-b border-divider py-4 last:border-b-0"
                >
                  <p className="font-mono text-2xl text-accent">
                    Magnitude {gempa.magnitude}
                  </p>
                  <p>{gempa.wilayah}</p>
                  <p className="text-sm text-muted">
                    Kedalaman {gempa.kedalaman}, terjadi{" "}
                    {formatTanggalGempa(gempa.tanggal)} pukul{" "}
                    {formatJamGempa(gempa.jam)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <KualitasUdaraSection center={wilayah ? pusatPeta : undefined} wilayah={wilayah} />
      </main>
    </div>
  );
}
