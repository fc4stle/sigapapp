"use client";

interface GempaItem {
  magnitude: number;
  wilayah: string;
  tanggal: string;
  jam: string;
}

interface UdaraItem {
  parameter: string;
  value: number;
  location_name?: string;
  waktu?: string;
}

interface Props {
  gempaList: GempaItem[] | null;
  udaraList: UdaraItem[] | null;
  namaWilayah?: string;
}

const BULAN: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4,
  jun: 5, jul: 6, ags: 7, aug: 7, sep: 8, okt: 9,
  oct: 9, nov: 10, des: 11, dec: 11,
};

const SENTINEL_THRESHOLD = -900;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseGempaDateTime(tanggal: string, jam: string): Date | null {
  const t = tanggal.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!t) return null;
  const [, hari, bulanRaw, tahun] = t;
  const bulan = BULAN[bulanRaw.toLowerCase()];
  if (bulan === undefined) return null;
  const j = jam.trim().match(/^(\d{2}):(\d{2}):(\d{2})/);
  if (!j) return null;
  return new Date(
    Number(tahun),
    bulan,
    Number(hari),
    Number(j[1]),
    Number(j[2]),
    Number(j[3]),
  );
}

type UdaraLevel =
  | "baik"
  | "sedang"
  | "tidak_sehat"
  | "sangat_tidak_sehat"
  | "berbahaya"
  | "unknown";

function getUdaraLevel(parameter: string, value: number): UdaraLevel {
  if (value < SENTINEL_THRESHOLD) return "unknown";
  const p = parameter.toLowerCase().trim();

  if (p === "ispu" || p === "aqi" || p.includes("indeks")) {
    if (value <= 50) return "baik";
    if (value <= 100) return "sedang";
    if (value <= 199) return "tidak_sehat";
    if (value <= 299) return "sangat_tidak_sehat";
    return "berbahaya";
  }

  if (p.includes("pm25") || p.includes("pm2.5") || p.includes("pm2_5")) {
    if (value < 35) return "baik";
    if (value <= 55) return "sedang";
    if (value <= 150) return "tidak_sehat";
    if (value <= 250) return "sangat_tidak_sehat";
    return "berbahaya";
  }

  if (p.includes("pm10")) {
    if (value < 50) return "baik";
    if (value < 100) return "sedang";
    if (value <= 150) return "tidak_sehat";
    if (value <= 350) return "sangat_tidak_sehat";
    return "berbahaya";
  }

  if (p === "o3" || p.includes("ozon")) {
    if (value < 100) return "baik";
    if (value < 168) return "sedang";
    if (value <= 208) return "tidak_sehat";
    if (value <= 404) return "sangat_tidak_sehat";
    return "berbahaya";
  }

  if (p === "no2" || p.includes("nitrogen")) {
    if (value < 80) return "baik";
    if (value < 200) return "sedang";
    if (value <= 1130) return "tidak_sehat";
    if (value <= 2260) return "sangat_tidak_sehat";
    return "berbahaya";
  }

  return "unknown";
}

function udaraLevelToStatus(
  level: UdaraLevel,
): "aman" | "waspada" | "bahaya" | "unknown" {
  if (level === "baik" || level === "sedang") return "aman";
  if (level === "tidak_sehat") return "waspada";
  if (level === "sangat_tidak_sehat" || level === "berbahaya") return "bahaya";
  return "unknown";
}

function udaraLevelToText(level: UdaraLevel): string {
  if (level === "baik") return "Baik, aman dihirup";
  if (level === "sedang") return "Sedang, masih aman";
  if (level === "tidak_sehat")
    return "Tidak sehat, kurangi aktivitas luar";
  if (level === "sangat_tidak_sehat")
    return "Sangat tidak sehat, hindari aktivitas luar";
  if (level === "berbahaya") return "Berbahaya, tetap di dalam ruangan";
  return "Data tidak tersedia";
}

export default function RingkasanStatus({
  gempaList,
  udaraList,
  namaWilayah = "wilayahmu",
}: Props) {
  const now = Date.now();

  // — Gempa: cari magnitude terbesar dalam 24 jam terakhir —
  let gempaMaxMag = 0;
  let gempaWilayah = "";
  let hasGempaWithin24h = false;
  let adaGempaBesar = false; // >= 5.0
  let adaGempaSedang = false; // 4.0-5.0
  const gempaDataTersedia = gempaList !== null && gempaList !== undefined;

  if (gempaDataTersedia && gempaList && gempaList.length > 0) {
    for (const g of gempaList) {
      const dt = parseGempaDateTime(g.tanggal, g.jam);
      if (!dt || now - dt.getTime() > MS_PER_DAY) continue;
      hasGempaWithin24h = true;
      if (g.magnitude >= 5.0) {
        adaGempaBesar = true;
        if (g.magnitude > gempaMaxMag) {
          gempaMaxMag = g.magnitude;
          gempaWilayah = g.wilayah;
        }
      } else if (g.magnitude >= 4.0) {
        adaGempaSedang = true;
        if (g.magnitude > gempaMaxMag) {
          gempaMaxMag = g.magnitude;
          gempaWilayah = g.wilayah;
        }
      }
    }
  }

  // — Udara: cari level terburuk dari data yang tidak stale —
  let udaraBuruk: UdaraLevel | null = null;
  let udaraTerburuk: UdaraLevel = "baik";
  let udaraParamDesc = "";
  const udaraDataTersedia = udaraList !== null && udaraList !== undefined;

  if (udaraDataTersedia && udaraList && udaraList.length > 0) {
    for (const u of udaraList) {
      const level = getUdaraLevel(u.parameter, u.value);
      if (level === "unknown") continue;
      if (
        level === "berbahaya" ||
        (level === "sangat_tidak_sehat" && udaraTerburuk !== "berbahaya") ||
        (level === "tidak_sehat" &&
          udaraTerburuk !== "berbahaya" &&
          udaraTerburuk !== "sangat_tidak_sehat") ||
        (level === "sedang" &&
          udaraTerburuk !== "berbahaya" &&
          udaraTerburuk !== "sangat_tidak_sehat" &&
          udaraTerburuk !== "tidak_sehat") ||
        (level === "baik" && udaraTerburuk === "baik")
      ) {
        udaraTerburuk = level;
        udaraBuruk = level;
        udaraParamDesc = `${u.parameter.toUpperCase()} ${u.value}`;
      }
    }
  }

  // — Tentukan status keseluruhan —
  const udaraStatus = udaraDataTersedia
    ? udaraLevelToStatus(udaraTerburuk)
    : "unknown";

  // Netral: kalau salah satu data tidak tersedia
  const dataLengkap = gempaDataTersedia && udaraDataTersedia;

  let level: "aman" | "waspada" | "bahaya" | "netral";
  let judul: string;
  let borderColor: string;
  let dotColor: string;
  let judulColor: string;
  let valueColor: string;
  let penjelasan: string;
  let gempaRingkas: string;
  let udaraRingkas: string;

  // Warna per status
  const WARNA = {
    aman: { border: "#6B8F5A", dot: "#6B8F5A", judul: "#9BC47A", value: "#9BC47A" },
    waspada: {
      border: "#D4A843",
      dot: "#D4A843",
      judul: "#E8D48B",
      value: "#E8D48B",
    },
    bahaya: {
      border: "#E24B4A",
      dot: "#E24B4A",
      judul: "#F48786",
      value: "#F48786",
    },
    netral: {
      border: "#5A5550",
      dot: "#8A8270",
      judul: "#B8AFA0",
      value: "#9A9384",
    },
  };

  if (!dataLengkap) {
    // Netral
    level = "netral";
    borderColor = WARNA.netral.border;
    dotColor = WARNA.netral.dot;
    judulColor = WARNA.netral.judul;
    valueColor = WARNA.netral.value;
    judul = "Data belum lengkap";

    const bagian: string[] = [];
    if (!gempaDataTersedia) bagian.push("gempa");
    if (!udaraDataTersedia) bagian.push("kualitas udara");
    penjelasan = `Data ${bagian.join(" dan ")} sedang tidak tersedia. Tidak bisa menilai kondisi wilayah saat ini.`;

    gempaRingkas = gempaDataTersedia
      ? hasGempaWithin24h
        ? `Magnitude ${gempaMaxMag} terdeteksi`
        : "Tidak ada gempa besar"
      : "Data tidak tersedia";

    udaraRingkas = udaraDataTersedia
      ? udaraTerburuk !== "baik"
        ? udaraLevelToText(udaraTerburuk)
        : "Baik, aman dihirup"
      : "Data tidak tersedia";
  } else if (adaGempaBesar || udaraStatus === "bahaya") {
    // Bahaya
    level = "bahaya";
    borderColor = WARNA.bahaya.border;
    dotColor = WARNA.bahaya.dot;
    judulColor = WARNA.bahaya.judul;
    valueColor = WARNA.bahaya.value;
    judul = "Waspada, ada risiko di sekitarmu";

    const alasan: string[] = [];
    if (adaGempaBesar)
      alasan.push(
        `gempa magnitude ${gempaMaxMag} terdeteksi di ${gempaWilayah}`,
      );
    if (udaraStatus === "bahaya")
      alasan.push(`kualitas udara ${udaraLevelToText(udaraTerburuk).toLowerCase()} di sekitar ${namaWilayah}`);
    penjelasan = `Kondisi berbahaya: ${alasan.join(" dan ")}.`;

    gempaRingkas = adaGempaBesar
      ? `Magnitude ${gempaMaxMag} terdeteksi`
      : adaGempaSedang
        ? `Magnitude ${gempaMaxMag} terdeteksi`
        : "Tidak ada gempa besar";

    udaraRingkas = udaraLevelToText(udaraTerburuk);
  } else if (adaGempaSedang || udaraStatus === "waspada") {
    // Waspada
    level = "waspada";
    borderColor = WARNA.waspada.border;
    dotColor = WARNA.waspada.dot;
    judulColor = WARNA.waspada.judul;
    valueColor = WARNA.waspada.value;
    judul = "Perlu diwaspadai";

    const alasan: string[] = [];
    if (adaGempaSedang)
      alasan.push(
        `gempa magnitude ${gempaMaxMag} terdeteksi di ${gempaWilayah}`,
      );
    if (udaraStatus === "waspada")
      alasan.push(
        `kualitas udara tidak sehat di sekitar ${namaWilayah}`,
      );
    penjelasan = `Perlu waspada: ${alasan.join(" dan ")}.`;

    gempaRingkas = adaGempaSedang
      ? `Magnitude ${gempaMaxMag} terdeteksi`
      : "Tidak ada gempa besar";

    udaraRingkas = udaraLevelToText(udaraTerburuk);
  } else {
    // Aman
    level = "aman";
    borderColor = WARNA.aman.border;
    dotColor = WARNA.aman.dot;
    judulColor = WARNA.aman.judul;
    valueColor = WARNA.aman.value;
    judul = "Aman untuk beraktivitas";

    penjelasan = `Kondisi aman di sekitar ${namaWilayah}. Tidak ada gempa besar dalam 24 jam terakhir dan udara masih baik.`;

    gempaRingkas = hasGempaWithin24h
      ? `Magnitude ${gempaMaxMag} (di bawah 4.0)`
      : "Tidak ada gempa besar";

    udaraRingkas = udaraLevelToText(udaraTerburuk);
  }

  return (
    <section className="mb-6" aria-label="Ringkasan status wilayah">
      <div
        style={{
          backgroundColor: "#181510",
          border: `1px solid ${borderColor}`,
          borderLeft: `4px solid ${borderColor}`,
          borderRadius: "6px",
          padding: "18px 20px",
        }}
      >
        {/* Baris atas: dot + judul */}
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
          <span
            style={{
              fontSize: "17px",
              fontWeight: 600,
              color: judulColor,
            }}
          >
            {judul}
          </span>
        </div>

        {/* Penjelasan */}
        <p className="mt-2" style={{ fontSize: "13px", color: "#9A9384" }}>
          {penjelasan}
        </p>

        {/* 2 baris ringkas */}
        <div className="mt-3 flex flex-col gap-1">
          <p style={{ fontSize: "13px" }}>
            <span style={{ color: "#EDE6D8" }}>Gempa: </span>
            <span style={{ color: valueColor }}>{gempaRingkas}</span>
          </p>
          <p style={{ fontSize: "13px" }}>
            <span style={{ color: "#EDE6D8" }}>Udara: </span>
            <span style={{ color: valueColor }}>{udaraRingkas}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
