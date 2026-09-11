"use client";

import { gempaKey, useGempaHover } from "./GempaHoverProvider";

interface Gempa {
  magnitude: number;
  wilayah: string;
  tanggal: string;
  jam: string;
  kedalaman: string;
  lintang: number;
  bujur: number;
  _jarak?: number;
}

interface Props {
  gempaList: Gempa[];
  namaWilayah: string;
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

export default function GempaList({ gempaList, namaWilayah }: Props) {
  const { hoveredGempaKey, setHoveredGempaKey } = useGempaHover();
  const koordinatWilayah = gempaList.some((g) => typeof g._jarak === "number");

  return (
    <>
      {koordinatWilayah && (
        <p className="text-xs text-muted">
          Diurutkan dari yang terdekat dengan {namaWilayah}
        </p>
      )}
      <ul className="flex flex-col">
        {gempaList.map((gempa, index) => {
          const key = gempaKey(gempa);
          const isHovered = hoveredGempaKey === key;

          return (
            <li
              key={index}
              onMouseEnter={() => setHoveredGempaKey(key)}
              onMouseLeave={() => setHoveredGempaKey(null)}
              onClick={() =>
                setHoveredGempaKey((current) => (current === key ? null : key))
              }
              className="flex cursor-pointer flex-col gap-1 border-b border-l-2 border-divider py-4 pl-3 transition-colors duration-200 last:border-b-0"
              style={{
                borderLeftColor: isHovered ? "#D99A3E" : "transparent",
                backgroundColor: isHovered ? "rgba(237, 230, 216, 0.04)" : "transparent",
              }}
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
              {"_jarak" in gempa && gempa._jarak !== undefined && (
                <p className="text-xs text-muted">
                  {Math.round(gempa._jarak)} km dari {namaWilayah}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
