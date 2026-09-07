"use client";

import dynamic from "next/dynamic";

const PetaGempa = dynamic(() => import("./PetaGempa"), { ssr: false });

export default function PetaGempaWrapper({
  center,
}: {
  center?: [number, number];
}) {
  return <PetaGempa center={center} />;
}
