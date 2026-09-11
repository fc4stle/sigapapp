"use client";

import dynamic from "next/dynamic";

const PetaGempa = dynamic(() => import("./PetaGempa"), { ssr: false });

interface Gempa {
  magnitude: number;
  kedalaman: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  lintang: number;
  bujur: number;
}

export default function PetaGempaWrapper({
  center,
  gempaList,
}: {
  center?: [number, number];
  gempaList?: Gempa[];
}) {
  return <PetaGempa center={center} gempaList={gempaList} />;
}
